// Fictional visitor data used only by isolated local-browser checks.
module.exports=async function unlockBirthday(page,name='小满',birthday='2000.02.01'){
 await page.locator('#birthday-name').fill(name);await page.locator('#birthday-password').fill(birthday);await page.locator('#identity-submit').click();await page.locator('#start').waitFor({state:'visible'});
};
