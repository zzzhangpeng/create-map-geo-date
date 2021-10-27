const request = require("request");
const fs = require("fs");
const Bar = require('progress-barjs');

const get = (url) => {
  return new Promise((resolve) => {
    request.get(url, (err, response, body) => {
      resolve(response);
    });
  });
};

const writeFile = (name, content) => {
  fs.writeFileSync(name, content, function (err) {
    if (err) {
      return console.error(err);
    }
  });
};

const FULL_URL = `https://geo.datav.aliyun.com/areas_v2/bound/geojson?code=`;

let DatePre = new Date();
const year = DatePre.getFullYear();
const month = DatePre.getMonth() + 1;
const date = DatePre.getDate();
const hour = DatePre.getHours();
const minutes = DatePre.getMinutes();
const seconds = DatePre.getSeconds();
DatePre = `${year}-${month}-${date} ${hour}-${minutes}-${seconds}`;

(function checkExist() {
  const a = fs.existsSync("out");
  if (!a) {
    fs.mkdirSync("out");
  }
  const b = fs.existsSync(`out/${DatePre}`);
  if (!b) {
    fs.mkdirSync(`out/${DatePre}`);
  }
  const c = fs.existsSync(`out/${DatePre}/province`);
  if (!c) {
    fs.mkdirSync(`out/${DatePre}/province`);
  }
  const d = fs.existsSync(`out/${DatePre}/city`);
  if (!d) {
    fs.mkdirSync(`out/${DatePre}/city`);
  }
})();

(async () => {
  try {
    let result = await get(FULL_URL + "100000_full");
    result = JSON.parse(result.body);
    const PROVINCE_LIST = result.features
      .filter((t) => t.properties && t.properties.name)
      .map((t) => {
        return {
          name: t.properties.name,
          adcode: t.properties.adcode,
        };
      }); // 省份的 name、adcode数据源
    let provinceCount = {
      total: PROVINCE_LIST.length,
      successed: 0,
      failed: 0
    };
    let provinceProgressBar = Bar({
      info: '各省边界数据下载进度:',
      total: PROVINCE_LIST.length,
    });
    PROVINCE_LIST.map(async (t, i) => {
      try {
        let res = await get(FULL_URL + `${t.adcode}_full`);
        writeFile(
            `./out/${DatePre}/province/${t.adcode}-${t.name}.json`,
            res.body
        );
        provinceCount.successed++;
      } catch (e) {
        provinceCount.failed++;
      }
      provinceProgressBar.tick(`successed:${provinceCount.successed};failed:${provinceCount.failed};total:${provinceCount.total}`);
    });
    let CITY_LIST = [];
    for (let i = 0; i < PROVINCE_LIST.length; i++) {
      const t = PROVINCE_LIST[i];
      let res = await get(FULL_URL + `${t.adcode}_full`);
      res = JSON.parse(res.body);
      const x = res.features
        .filter((r) => r.properties && r.properties.name)
        .map((y) => {
          return {
            name: y.properties.name,
            adcode: y.properties.adcode,
          };
        });
      CITY_LIST = [...CITY_LIST, ...x];
    }
    let cityCount = {
      successed: 0,
      failed: 0,
      total: CITY_LIST.length,
    };
    let cityProgressBar = Bar({
      info: '各市边界数据下载进度:',
      total: CITY_LIST.length,
    });
    CITY_LIST.map(async (t, i) => {
      let res = await get(FULL_URL + `${t.adcode}_full`);
      try {
        if (res.body.indexOf("<?xml") !== -1) {
          res = await get(FULL_URL + `${t.adcode}`);
        }
        writeFile(
            `./out/${DatePre}/city/${t.adcode}-${t.name}.json`,
            res.body
        );
        cityCount.successed++;
      } catch (error) {
        cityCount.failed++;
      }
      cityProgressBar.tick(`successed:${cityCount.successed};failed:${cityCount.failed};total:${cityCount.total}`);
    });
  } catch (error) {
    console.log(error);
  }
})();
