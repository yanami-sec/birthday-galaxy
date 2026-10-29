import assert from 'node:assert/strict';
import {createBirthdayProfile,shanghaiToday,cakeGreeting,birthdayBlessing,getRecipient,setRecipient} from '../web/birthday-profile.js';
const today={year:2026,month:10,day:29};
const p=createBirthdayProfile(' 小满 ','2000.02.01',today);
assert.equal(p.name,'小满');assert.equal(p.birthdayAge,27);assert.equal(p.currentAge,26);assert.equal(p.celebrationYear,2027);assert.equal(p.birthdayLabel,'02.01');assert.equal('birthYear' in p,false);assert.equal('birthday' in p,false);
const upcoming=createBirthdayProfile('小满','2000.12.31',today);assert.equal(upcoming.birthdayAge,26);assert.equal(upcoming.currentAge,25);
assert.equal(createBirthdayProfile('小满','2000.02.29',today).birthdayAge,27);
assert.equal(createBirthdayProfile('小满','2026.10.29',today).birthdayAge,0);
assert.equal(createBirthdayProfile('小满','1900.01.01',today).birthdayAge,127);
for(const [date,age,year] of [[{year:2026,month:1,day:25},18,2026],[{year:2026,month:1,day:26},18,2026],[{year:2026,month:1,day:27},19,2027],[today,19,2027]]){
 const example=createBirthdayProfile('生日的你','2008.01.26',date);assert.equal(example.birthdayAge,age);assert.equal(example.celebrationYear,year);
}
assert.equal(createBirthdayProfile('小满','2000.12.31',{year:2026,month:12,day:31}).birthdayAge,26);
for(const date of ['2001.02.29','1900.02.29','2000.13.01','2000.00.01','2000.04.31','2000.01.00','2000.2.1','2000-02-01','1899.01.01','2027.01.01','2026.10.30'])assert.throws(()=>createBirthdayProfile('小满',date,today));
assert.throws(()=>createBirthdayProfile(' ','2000.02.01',today));assert.throws(()=>createBirthdayProfile('名'.repeat(21),'2000.02.01',today));
assert.deepEqual(shanghaiToday(new Date('2026-12-31T16:01:00Z')),{year:2027,month:1,day:1});
assert.equal(createBirthdayProfile('小满','2000.02.01',shanghaiToday(new Date('2026-12-31T16:01:00Z'))).birthdayAge,27);
assert.ok(cakeGreeting(p).includes('小满'));assert.ok(cakeGreeting(p).includes('27'));assert.ok(cakeGreeting({...p,name:'名'.repeat(20)}).length<=22);
const letter=birthdayBlessing(p);assert.ok(letter.title.includes('小满'));assert.ok(letter.title.includes('27'));assert.equal(letter.paragraphs.length,4);
setRecipient(p);assert.equal(getRecipient(),p);setRecipient(null);
console.log('Birthday entry: date validation, leap years, Shanghai dates, birthday/current ages and personalized blessings passed');
