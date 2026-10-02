export const stateKeys = ['phase','phoneStep','connected','permission','member','accountMode','voice','attempts','hubVisible','reduced','roomCode'];
export const phoneSteps = ['pair','detected','appclip','download','store','installing','installed','connecting','rationale','permission','denied','settings','mic','signup','email','offer','pay','success','dpad','voice-success'];
export const remoteMethods = ['scan','openApp','micAllowed','startHold','endHold','cancelHold','buy','browse','move','disconnectPhone'];
export function phoneState(scene) {
  return {...Object.fromEntries(stateKeys.map(key=>[key,scene[key]])), gameMenu:!!scene.gameMenu, scenario:'happy'};
}
export function applyPhoneCommand(scene, command) {
  if (!command || typeof command !== 'object') return;
  if (command.method === 'syncPhone') {
    const patch=command.value;
    if (!patch || typeof patch !== 'object') return;
    // A client can navigate the prototype's phone UI, never grant membership.
    if(phoneSteps.includes(patch.phoneStep))scene.phoneStep=patch.phoneStep;
    if(['signup','signin'].includes(patch.accountMode))scene.accountMode=patch.accountMode;
    scene.onchange();return;
  }
  if(!remoteMethods.includes(command.method))return;
  if(command.method==='buy'&&scene.phoneStep!=='pay')return;
  if(command.method==='move'&&!['left','right','up','down','enter','back'].includes(command.value))return;
  scene[command.method]?.(command.value);
  scene.onchange();
}
