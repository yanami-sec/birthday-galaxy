// The entry is a local birthday ritual. No network request or credential storage.
let recipient = null;
export function shanghaiToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Shanghai',year:'numeric',month:'numeric',day:'numeric'}).formatToParts(now);
  const value=type=>Number(parts.find(part=>part.type===type).value);
  return {year:value('year'),month:value('month'),day:value('day')};
}
export function createBirthdayProfile(nameValue, birthdayValue, today = shanghaiToday()) {
  const name=String(nameValue??'').replace(/[\u0000-\u001f\u007f]/g,'').trim();
  if(!name)throw new Error('先告诉我，今天想被祝福的名字吧。');
  if(Array.from(name).length>20)throw new Error('名字请写在 20 个字以内。');
  const match=/^(\d{4})\.(\d{2})\.(\d{2})$/.exec(String(birthdayValue??'').trim());
  if(!match)throw new Error('生日口令请按 2000.02.01 这样的格式填写。');
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const leap=year%4===0&&(year%100!==0||year%400===0),days=[31,leap?29:28,31,30,31,30,31,31,30,31,30,31];
  if(year<1900||month<1||month>12||day<1||day>days[month-1])throw new Error('这个生日好像不存在，再检查一下年月日吧。');
  if(year>today.year||year===today.year&&(month>today.month||month===today.month&&day>today.day))throw new Error('出生日期还在未来，请再检查一下。');
  const before=today.month<month||today.month===month&&today.day<day;
  const passed=today.month>month||today.month===month&&today.day>day;
  const celebrationYear=today.year+(passed?1:0);
  const birthdayAge=celebrationYear-year,currentAge=today.year-year-(before?1:0);
  return Object.freeze({name,birthdayAge,currentAge,celebrationYear,birthdayLabel:`${match[2]}.${match[3]}`});
}
export function setRecipient(profile){recipient=profile;}
export function getRecipient(){return recipient;}
export function cakeGreeting(profile){return Array.from(profile.name).length>12?profile.name:`${profile.name}，${profile.birthdayAge}岁快乐`;}
export function birthdayBlessing(profile){
  const {name,birthdayAge}=profile;
  return {
    title:`${name}，${birthdayAge}岁生日快乐`,
    dedication:`写给 ${name} · 属于你的第 ${birthdayAge} 岁`,
    paragraphs:[
      `今天你亲手挑好了喜欢的蛋糕，也把小小的愿望交给了烛光。${name}，这一整片星河，都是为你亮起的。`,
      `愿${birthdayAge}岁的你，依然有好奇心，也有做自己的勇气。开心时尽情笑，疲惫时放心停一停，不必急着成为谁期待的模样。`,
      '愿你被认真惦记，被温柔以待；愿生活里有小小的惊喜，身边有愿意听你说话的人。',
      '愿刚刚许下的心愿，在往后的日子里慢慢实现。新的一岁，平安、自由、明亮，也多爱自己一点。'
    ],
    closing:`${name}，今天的美好都属于你。`
  };
}
