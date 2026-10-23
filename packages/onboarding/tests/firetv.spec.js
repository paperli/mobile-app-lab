import { test, expect } from '@playwright/test';

const state = page => page.evaluate(() => window.weekendLab?.getState());
const phase = (page, value) => expect.poll(async () => (await state(page))?.phase, { timeout:30000 }).toBe(value);
async function skip(page, destination) {
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await phase(page, destination);
}
async function jump(page, destination) {
  await page.getByRole('button', { name:'Prototype Controls', exact:true }).click();
  await page.locator(`[data-scene="${destination}"]`).click();
  await phase(page, destination);
}

async function watchPhoneCheckout(phone) {
  await phone.addInitScript(() => {
    window.checkoutScreensSeen = [];
    const observe = () => {
      const checkout = document.querySelector('.ios-welcome,.ios-auth,.ios-paywall,.ios-success');
      if (checkout) window.checkoutScreensSeen.push(checkout.className);
    };
    new MutationObserver(observe).observe(document, { childList:true, subtree:true });
  });
}

test('gallery lists three flows and works on a phone', async ({ page }) => {
  await page.goto('/onboarding/');
  await expect(page.getByRole('heading', { level:2 })).toHaveText(['Try, then subscribe','Subscribe, then play','Skip, then try']);
  await expect(page.getByRole('link', { name:'Play full flow' })).toHaveCount(3);
  await page.screenshot({ path:'/tmp/firetv-onboarding-landing.png', fullPage:true });
  await page.setViewportSize({ width:393, height:852 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(393);
  await page.getByRole('link', { name:'Play Fire TV subscribed onboarding', exact:true }).click();
  await phase(page, 12);
  await expect(page.getByRole('button', { name:'Continue with Subscription' })).toBeDisabled();
});

test('Fire TV subscription survives all skips and reveals a subscribed hub without an upsell', async ({ page }) => {
  const errors=[]; page.on('pageerror',error=>errors.push(error.message));
  await page.goto('/onboarding/play.html?flow=firetv-subscribed');
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-checked','true');
  await page.keyboard.press('Enter'); await phase(page, 1);
  expect((await state(page)).member).toBe(true);
  await jump(page, 2);
  await skip(page, 3); await skip(page, 4); await skip(page, 7); await skip(page, 11);
  await expect.poll(async () => (await state(page)).hubVisible, { timeout:30000 }).toBe(true);
  expect((await state(page)).outroState).toBe('complete');
  expect((await state(page)).hostLine).toContain('grab your remote');
  await expect(page.locator('.tv-upsell')).toHaveCount(0);
  await expect(page.frameLocator('#onboardingHub').getByRole('dialog', { name:'Welcome to Premium' })).toHaveCount(0);
  await expect(page.frameLocator('#onboardingHub').getByText('Start free trial', { exact:true })).toHaveCount(0);
  await page.getByRole('button', { name:'↻ Restart' }).click(); await phase(page, 12);
  expect((await state(page)).member).toBe(false);
  await expect(page.getByRole('checkbox')).toHaveAttribute('aria-checked','false');
  expect(errors).toEqual([]);
});

test('skipping Fire TV paywall keeps the end-game upsell and can browse without subscribing', async ({ page }) => {
  await page.goto('/onboarding/play.html?flow=firetv-skipped');
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.keyboard.press('Enter'); await phase(page, 1);
  expect((await state(page)).member).toBe(false);
  await jump(page, 7); await skip(page, 8);
  await expect(page.locator('.tv-upsell')).toBeVisible();
  await expect(page.locator('#phone').getByRole('heading', { name:'Game night, every night.' })).toBeVisible();
  await skip(page, 8);
  await expect.poll(async () => (await state(page)).hubVisible).toBe(true);
  expect((await state(page)).member).toBe(false);
});

test('Back on either Fire TV sheet takes the skip flow', async ({ page }) => {
  await page.goto('/onboarding/play.html?flow=firetv-subscribed');
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.keyboard.press('Escape'); await phase(page, 1);
  expect((await state(page)).flow).toBe('firetv-skipped');
  expect((await state(page)).member).toBe(false);
  await expect(page).toHaveURL(/flow=firetv-skipped/);
});

test('subscribing on Fire TV goes through both games to an immediate D-pad, even while the hub loads', async ({ page, browser }) => {
  test.setTimeout(120000);
  await page.emulateMedia({ reducedMotion:'no-preference' });
  let releaseHub;
  const hubGate = new Promise(resolve => { releaseHub = resolve; });
  await page.route('**/?view=hub9&detail=immersive&onboardingOrigin=*', async route => {
    await hubGate; await route.continue();
  });
  await page.goto('/onboarding/play.html?flow=firetv-subscribed');
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name:'Continue with Subscription' }).click();
  await phase(page,1); expect((await state(page)).member).toBe(true);
  await phase(page,2);
  await expect.poll(async () => (await state(page)).puzzleReady, { timeout:30000 }).toBe(true);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Enter');
  await phase(page,3); await phase(page,4);
  await expect.poll(async () => (await state(page)).phoneUrl).toBeTruthy();
  const context = await browser.newContext({ viewport:{width:393,height:852}, reducedMotion:'reduce' });
  const phone = await context.newPage(); await watchPhoneCheckout(phone);
  await phone.goto((await state(page)).phoneUrl);
  await phone.getByRole('button', { name:'Set up microphone' }).click();
  await phone.getByRole('button', { name:'Allow Microphone' }).click(); await phase(page,6);
  const mic = phone.getByRole('button', { name:'Press and hold to answer' });
  const bounds = await mic.boundingBox();
  await phone.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await phone.mouse.down(); await phone.waitForTimeout(800); await phone.mouse.up();
  await phase(page,7);
  await expect(phone.locator('.dpad')).toBeVisible();
  await phase(page,11);
  expect((await state(page)).outroState).toBe('loading');
  await expect(phone.locator('.dpad')).toBeVisible();
  expect(await phone.evaluate(() => window.checkoutScreensSeen)).toEqual([]);
  // The first input is retained while the hub loads; controls work during the
  // host's sign-off rather than waiting for the final fade to finish.
  await phone.getByRole('button', { name:'Down', exact:true }).click();
  releaseHub();
  await expect.poll(async () => (await state(page)).hubRevealing).toBe(true);
  const focused = page.frameLocator('#onboardingHub').locator('[data-tile-focused="true"]');
  await expect(focused).toHaveCount(1);
  const firstGame = await focused.getAttribute('data-game-tile');
  await phone.getByRole('button', { name:'Right', exact:true }).click();
  await expect.poll(() => focused.getAttribute('data-game-tile')).not.toBe(firstGame);
  expect((await state(page)).hubVisible).toBe(false);
  await expect.poll(async () => (await state(page)).hubVisible, { timeout:30000 }).toBe(true);
  expect((await state(page)).hostLine).toContain('d-pad on your phone');
  await expect(phone.locator('.dpad')).toBeVisible();
  await expect(phone.getByRole('heading', { name:'Game night, every night.' })).toHaveCount(0);
  await expect(page.frameLocator('#onboardingHub').getByRole('dialog', { name:'Welcome to Premium' })).toHaveCount(0);
  await expect(page.frameLocator('#onboardingHub').getByText('Start free trial', { exact:true })).toHaveCount(0);
  await phone.screenshot({ path:'/tmp/firetv-subscriber-phone-dpad.png' });
  expect(await phone.evaluate(() => window.checkoutScreensSeen)).toEqual([]);
  await context.close();
});

test('a subscriber phone joins and reconnects during a failed hub load without seeing checkout', async ({ page, browser }) => {
  const hub = '**/?view=hub9&detail=immersive&onboardingOrigin=*';
  await page.route(hub, route => route.abort());
  await page.goto('/onboarding/play.html?flow=firetv-subscribed&scene=11'); await phase(page,11);
  await expect.poll(async () => (await state(page)).phoneUrl).toBeTruthy();
  const context = await browser.newContext({ viewport:{width:393,height:852}, reducedMotion:'reduce' });
  const phone = await context.newPage(); await watchPhoneCheckout(phone);
  await phone.goto((await state(page)).phoneUrl);
  await expect(phone.locator('.dpad')).toBeVisible();
  expect(await phone.evaluate(() => window.checkoutScreensSeen)).toEqual([]);
  await phone.reload();
  await expect(phone.locator('.dpad')).toBeVisible();
  await expect(page.getByRole('button', { name:'Retry loading the hub' })).toBeVisible({ timeout:15000 });
  expect(await phone.evaluate(() => window.checkoutScreensSeen)).toEqual([]);
  await page.unroute(hub); await page.getByRole('button', { name:'Retry loading the hub' }).click();
  await expect.poll(async () => (await state(page)).hubVisible, { timeout:30000 }).toBe(true);
  await phone.reload(); await expect(phone.locator('.dpad')).toBeVisible();
  expect(await phone.evaluate(() => window.checkoutScreensSeen)).toEqual([]);
  await expect(page.locator('.tv-upsell')).toHaveCount(0);
  await context.close();
});

test('skipped Fire TV subscribers can subscribe and subscribed-flow viewers can skip the paywall', async ({ page }) => {
  await page.goto('/onboarding/play.html?flow=firetv-skipped');
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name:'Continue with Subscription' }).click();
  await phase(page,1);
  expect((await state(page)).flow).toBe('firetv-subscribed');
  expect((await state(page)).member).toBe(true);
  await jump(page,7); await phase(page,11);
  await expect(page.locator('#phone .dpad')).toBeVisible();
  await expect(page.locator('.tv-upsell')).toHaveCount(0);

  await page.getByRole('button', { name:'↻ Restart' }).click(); await phase(page,12);
  await expect(page.locator('.onboarding-paywall.is-ready')).toBeVisible();
  await page.getByRole('button', { name:'Skip for now' }).click(); await phase(page,1);
  expect((await state(page)).flow).toBe('firetv-skipped');
  expect((await state(page)).member).toBe(false);
  await jump(page,7); await phase(page,8);
  await expect(page.locator('.tv-upsell')).toBeVisible();
  await expect(page.locator('#phone').getByRole('heading', { name:'Game night, every night.' })).toBeVisible();
});

test('a failed hub load can be retried before the subscribed ending fades', async ({ page }) => {
  const hub = '**/?view=hub9&detail=immersive&onboardingOrigin=*';
  await page.route(hub, route => route.abort());
  await page.goto('/onboarding/play.html?flow=firetv-subscribed&scene=11');
  await phase(page,11);
  await expect(page.getByRole('button', { name:'Retry loading the hub' })).toBeVisible({ timeout:15000 });
  expect((await state(page)).hubRevealing).toBe(false);
  expect((await state(page)).hubVisible).toBe(false);
  await page.unroute(hub);
  await page.getByRole('button', { name:'Retry loading the hub' }).click();
  await expect.poll(async () => (await state(page)).hubVisible, { timeout:20000 }).toBe(true);
  await expect(page.locator('.tv-upsell')).toHaveCount(0);
});

test('restarting during the full-motion sign-off cancels the old hub handoff', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'no-preference' });
  await page.goto('/onboarding/play.html?flow=firetv-subscribed&scene=11');
  await expect.poll(async () => (await state(page))?.outroState, { timeout:20000 }).toBe('fading');
  expect((await state(page)).hubRevealing).toBe(true);
  await page.getByRole('button', { name:'↻ Restart' }).click(); await phase(page,12);
  await page.waitForTimeout(8500);
  expect((await state(page)).phase).toBe(12);
  expect((await state(page)).hubVisible).toBe(false);
  await expect(page.locator('.onboarding-paywall')).toBeVisible();
  await jump(page,1);
  await page.waitForTimeout(3300);
  await page.screenshot({ path:'/tmp/firetv-onboarding-restarted.png' });
});

test('pre-roll still uses the same paywall and completes its original handoff', async ({ page }) => {
  await page.goto('/preroll/play.html?screen=paywall');
  await expect(page.locator('#screen-paywall.is-ready')).toBeVisible();
  await page.getByRole('checkbox').click();
  await page.getByRole('button', { name:'Continue with Subscription' }).click();
  await expect(page).toHaveURL(/subscribed=true/);
});
