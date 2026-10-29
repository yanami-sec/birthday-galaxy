// One catalog drives the visible options, validation and random combinations.
export const CATALOG = {
  shape: [["round","圆形"],["heart","爱心"],["square","方形"],["hexagon","六角"],["flower","花瓣"],["star","星形"]],
  skin: [["galaxy","璀璨星河"],["aurora","极光幻彩"],["marble","流光云纹"],["rainbow","彩虹渐变"],["ombre","暮色渐层"],["velvet","丝绒纯色"],["chocolate","浓巧可可"]],
  creamStyle: [["rosettes","✿ 奶油裱花"],["drip","〰 流心淋面"],["pearls","○ 珍珠花边"],["ribbon","缎带波浪"],["braid","双股编织"],["chocolate","巧克力淋边"],["none","纯粹一点"]],
  topping: [["strawberry","🍓 草莓花园"],["blueberry","🫐 蓝莓时光"],["cherries","🍒 双生樱桃"],["hearts","♡ 爱心糖饰"],["stars","✧ 星星点点"],["moons","☾ 月亮糖片"],["flowers","✿ 糖霜花园"],["butterflies","蝴蝶花舞"],["macarons","马卡龙"],["chocolate","巧克力砖"],["balls","彩色糖球"],["snowflakes","雪花晶片"],["crown","小小皇冠"],["mixed","缤纷混搭"],["none","留一点空白"]],
  candles: [["single","经典一支"],["three","三支心意"],["number","数字蜡烛"],["spiral","螺旋糖纹"],["rainbow","五彩烛光"],["heart","爱心蜡烛"],["star","星星蜡烛"],["sparkler","仙女棒"],["none","先不点灯"]],
  plate: [["galaxy","星光盘"],["ivory","奶白瓷盘"],["gold","香槟金盘"],["rose","玫瑰金盘"],["crystal","水晶盘"],["petal","花瓣托盘"],["hexagon","六角托盘"],["pedestal","高脚蛋糕架"],["none","不要底盘"]]
};
export const COLOR_SETS = [
  ["#253db0","#aa69d1","#ed81b2"],["#6639c5","#ac86f0","#76c2e9"],["#b94d82","#f1b0cb","#7b49b8"],
  ["#238c87","#8bd6bd","#d6e6b5"],["#e7795d","#f0c18d","#d58cb3"],["#4b92bf","#add9ed","#ede5fa"],
  ["#734337","#bc8a6c","#f4ddbd"],["#dd9dbe","#f3d8e7","#bca3d9"],["#d0a54b","#f1da8d","#fff3d3"],
  ["#27335a","#66708f","#c2c7dc"],["#cb526a","#e69b9f","#f8d8c0"],["#967052","#c6aa7c","#e8dbb8"]
];
export const SWATCHES = [...new Set(COLOR_SETS.flat())];
