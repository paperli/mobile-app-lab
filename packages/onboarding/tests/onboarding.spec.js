import { test,expect } from '@playwright/test';
const state=page=>page.evaluate(()=>window.weekendLab?.getState());
const open=async(page,phase)=>{
  await page.goto(`/onboarding/?scene=${phase}`,{waitUntil:'domcontentloaded'});
  await expect.poll(async()=>(await state(page))?.phase,{timeout:30000}).toBe(phase);
};
const phoneScreen=page=>page.locator('#phone .wk-phone__screen');

test('intro has no Skip; early skips reveal both answers before the upsell',async({page})=>{
  await open(page,0);expect((await state(page)).buttons.some(b=>b.isSkip)).toBe(false);
  await open(page,2);expect((await state(page)).focus).toBe(-1);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await state(page)).phase).toBe(3);
  expect((await state(page)).focus).toBe(-1);
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await state(page)).phase).toBe(4);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await state(page)).phase).toBe(7);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await state(page)).phase).toBe(8);
  await expect(page.locator('.tv-upsell.unpaired')).toBeVisible();
  await expect(phoneScreen(page).getByRole('heading',{name:'Game night, every night.'})).toBeVisible();
});

test('Jeopardy focuses an answer only after all options have arrived',async({page})=>{
  await open(page,2);
  expect((await state(page)).puzzleReady).toBe(false);
  await expect.poll(async()=>(await state(page)).puzzleReady,{timeout:20000}).toBe(true);
  const s=await state(page);expect(s.buttons[s.focus].type).toBe('answer');
  await page.keyboard.press('ArrowRight');await page.keyboard.press('ArrowRight');
  const skip=await state(page);expect(skip.buttons[skip.focus].isSkip).toBe(true);
  await page.keyboard.press('ArrowUp');
  expect((await state(page)).buttons[(await state(page)).focus].type).toBe('answer');
});

test('a separate phone joins the TV, signs up, chooses a plan, pays, and controls the hub',async({page,browser})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await open(page,8);
  await expect.poll(async()=>(await state(page)).phoneUrl).toBeTruthy();
  const url=(await state(page)).phoneUrl;
  const mobile=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await mobile.newPage();phone.on('pageerror',e=>errors.push(e.message));
  await phone.goto(url);
  await expect(phone.getByRole('heading',{name:'Game night, every night.'})).toBeVisible();
  await expect(page.locator('.tv-upsell.paired')).toBeVisible();
  await phone.screenshot({path:'/tmp/onboarding-signup.png'});
  await phone.getByRole('button',{name:'Continue with email'}).click();
  await expect(phone.getByRole('heading',{name:'Create your account'})).toBeVisible();
  await phone.locator('#prototypeEmail').fill('tester@example.com');
  await phone.locator('#prototypePassword').fill('pretend-password');
  await phone.getByRole('button',{name:'Create account',exact:true}).click();
  await expect(phone.getByRole('heading',{name:'How your free trial works'})).toBeVisible();
  await expect(phone.locator('.ios-price strong')).toHaveText('$0.00');
  await expect(phone.getByText('7 days free, then $14.99/month',{exact:true})).toBeVisible();
  await phone.screenshot({path:'/tmp/onboarding-checkout.png'});
  await phone.getByRole('button',{name:'Start my free trial now'}).click();
  await expect(phone.getByRole('dialog')).toBeVisible();
  await phone.getByRole('button',{name:'Cancel',exact:true}).click();
  await expect(phone.getByRole('dialog')).toHaveCount(0);
  await phone.getByRole('button',{name:'Start my free trial now'}).click();
  await phone.getByRole('button',{name:'Confirm with Side Button'}).click();
  await expect(phone.getByRole('heading',{name:'Welcome to Weekend.'})).toBeVisible();
  await expect(phone.locator('.dpad')).toBeVisible();
  await expect.poll(async()=>(await state(page)).hubVisible).toBe(true);
  await expect.poll(async()=>(await state(page)).member).toBe(true);
  const success=page.frameLocator('#onboardingHub').getByRole('dialog',{name:'Welcome to Premium'});
  await expect(success).toBeVisible({timeout:30000});
  await phone.getByRole('button',{name:'Select game'}).click();
  await expect(success).toHaveCount(0);
  await phone.screenshot({path:'/tmp/onboarding-dpad.png'});
  expect(errors).toEqual([]);
  await mobile.close();
});

test('paired voice round leads directly to signup',async({page,browser})=>{
  await open(page,4);await expect.poll(async()=>(await state(page)).phoneUrl).toBeTruthy();
  const context=await browser.newContext({viewport:{width:393,height:852},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const phone=await context.newPage();await phone.goto((await state(page)).phoneUrl);
  await phone.getByRole('button',{name:'Set up microphone'}).click();
  await phone.getByRole('button',{name:'Allow Microphone'}).click();
  await expect.poll(async()=>(await state(page)).phase).toBe(6);
  const mic=phone.getByRole('button',{name:'Press and hold to answer'});
  const bounds=await mic.boundingBox();await phone.mouse.move(bounds.x+bounds.width/2,bounds.y+bounds.height/2);await phone.mouse.down();
  await page.waitForTimeout(800);
  await phone.mouse.up();
  await expect.poll(async()=>(await state(page)).phase).toBe(7);
  await page.keyboard.press('ArrowRight');await page.keyboard.press('Enter');
  await expect(phone.getByRole('heading',{name:'Game night, every night.'})).toBeVisible();
  await expect(page.locator('.tv-upsell.paired')).toBeVisible();await context.close();
});

test('phone-only preview fits without horizontal overflow',async({page})=>{
  await page.setViewportSize({width:393,height:852});
  await page.goto('/onboarding/?scene=8&mobile=1');
  await expect(page.getByRole('heading',{name:'Game night, every night.'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(393);
});

test('full-motion reveal keeps focus off until the final answer and supports early Skip',async({page})=>{
  await page.emulateMedia({reducedMotion:'no-preference'});
  await open(page,2);
  expect((await state(page)).focus).toBe(-1);
  await page.waitForTimeout(3500);
  expect((await state(page)).puzzleReady).toBe(false);
  expect((await state(page)).focus).toBe(-1);
  await expect.poll(async()=>(await state(page)).puzzleReady,{timeout:20000}).toBe(true);
  await page.screenshot({path:'/tmp/onboarding-jeopardy.png'});
  await open(page,4);
  await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  await expect.poll(async()=>(await state(page)).phase).toBe(7);
});
