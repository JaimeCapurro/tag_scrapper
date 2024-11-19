const puppeteer = require("puppeteer-extra");
const RecaptchaPlugin = require("puppeteer-extra-plugin-recaptcha");
const cheerio = require("cheerio");
const fs = require("fs");

const clientes = require("../client/clientes");
const conexion = require("../config/conexion");

const costaArauco = async () => {
  //Datos del cliente

  puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: "2captcha",
        token: "4a30647819b70cd484a21535c4ff29fa",
      },
      visualFeedback: true,
    })
  );
  browser = await puppeteer.launch({
    headless: false,
  });
  page = await browser.newPage();

  await page.setViewport({ width: 1280, height: 1080 });
  await page.goto("https://ov.costarauco.cl/user/login");
  await page.solveRecaptchas();
  await page.waitForTimeout(3000);

};

exports.costaArauco = costaArauco;
