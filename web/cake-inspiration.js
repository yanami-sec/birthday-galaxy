export const MOODS = {
  starlit: { label: "星河常亮", note: "留一点浩瀚，也留一点惊喜", colors: ["#253db0","#aa69d1","#ed81b2"], cream: "#fff3de", skins: ["galaxy","marble","velvet"], accent: "#b895e8", glow: "#15112c", orbit: ["#fff2c4","#d4bbff","#a8d9ff"], lights: ["#ffc553","#ff77bd","#46d8ce","#4ebdff","#b19cff"], hearts: ["#ff9aca","#d4aeff","#ffd2dc"], pace: 1, title: "星河寄来的甜" },
  blush: { label: "桃雾来信", note: "把温柔调成甜甜的粉色", colors: ["#d982a6","#efbdcc","#c8a4df"], cream: "#fff0f5", skins: ["marble","ombre","velvet"], accent: "#e3a8bc", glow: "#2a1527", orbit: ["#ffe1d4","#ffb8d5","#e0b8f0"], lights: ["#ffb5c8","#f6c394","#d5b4ec","#fbe1cb"], hearts: ["#ffacd0","#ffd5dc","#f3bce2"], pace: .82, title: "一封桃色来信" },
  breeze: { label: "海盐晚风", note: "让蓝绿的晚风，吹慢一点时间", colors: ["#388e9f","#8dcecb","#b8cddd"], cream: "#ecfff7", skins: ["aurora","marble","velvet"], accent: "#91d5cb", glow: "#0d242b", orbit: ["#bef5e7","#b9d6ff","#e3f9ff"], lights: ["#66d6cc","#93c8ef","#c1e9d2","#dee7ff"], hearts: ["#a9e6dc","#b2d5f3","#dbe9ff"], pace: .62, title: "晚风里的小心愿" },
  sunset: { label: "落日序曲", note: "借一点落日，把今天照得暖暖的", colors: ["#df8c6b","#e9bd8d","#bd82a7"], cream: "#fff1d5", skins: ["ombre","marble","velvet"], accent: "#e9b17f", glow: "#2b181e", orbit: ["#ffe6af","#ffc5a0","#edb1cc"], lights: ["#ffc17b","#f3a39d","#e4b1d0","#ffdc9b"], hearts: ["#ffd0b4","#f2b2be","#ffe5be"], pace: .9, title: "把落日藏进奶油" },
  midnight: { label: "午夜漫游", note: "去很远的星空，许一个很近的愿望", colors: ["#3d386e","#8179b0","#c4b2d4"], cream: "#eee9ff", skins: ["galaxy","aurora","ombre"], accent: "#aea9e8", glow: "#12162d", orbit: ["#d0d8ff","#bdacff","#c4edff"], lights: ["#8f9de3","#b89bed","#a9d1e4","#e1c6f0"], hearts: ["#c2afff","#d0c4eb","#a5c9ef"], pace: .72, title: "午夜的一颗甜星" }
};

export function suggestRecipeName(design = {}) {
  return MOODS[design?.mood]?.title || MOODS.starlit.title;
}

export function recipeName(value) {
  return Array.from(String(value ?? "").replace(/[\u0000-\u001f\u007f]/g," ").trim()).slice(0,18).join("");
}
