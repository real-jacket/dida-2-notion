import puppeteer from 'puppeteer';
import axios from 'axios';

// 定义访问令牌和基础URL

const baseUrl = 'https://dida365.com';

const scope = 'tasks:read';

const redirect_uri = 'https://www.baidu.com';

const url = `${baseUrl}/oauth/authorize?scope=${scope}&client_id=${process.env.client_id}&state=state&redirect_uri=${redirect_uri}&response_type=code`;

async function getAccessToken() {
  // 启动无头浏览器
  const browser = await puppeteer.launch({ headless: true });
  let page = await browser.newPage();

  // 将Cookie字符串解析为Cookie对象
  const cookies = (domain) =>
    process.env.cookie.split('; ').map((cookie) => {
      const [name, ...rest] = cookie.split('=');
      const value = rest.join('=');
      return { name, value, domain }; // 根据实际情况设置domain
    });

  // 设置Cookie
  await page.setCookie.apply(page, cookies('dida365.com'));

  // 打开滴答清单的登录页面
  await page.goto(url, { waitUntil: 'load' });

  let temp_url = page.url();

  if (temp_url.includes('api.dida365.com')) {
    await page.close();

    page = await browser.newPage(temp_url);

    //重新设置 cookie
    await page.setCookie.apply(page, cookies('api.dida365.com'));

    await page.goto(temp_url, { waitUntil: 'load' });

    const newUrl = page.url();
  }

  // 点击登录按钮
  await page.click('button[type="submit"]');

  let redirectedUrl;
  // 等待发生重定向，使用 waitUntil: 'domcontentloaded' 以尽早获取 URL
  try {
    // 等待发生重定向，使用 waitUntil: 'domcontentloaded' 以尽早获取 URL
    await page.waitForNavigation({
      waitUntil: 'domcontentloaded', // 轻量级等待，不需等待整个页面加载
      timeout: 2000, // 设置超时，避免无限等待
    });

    // 获取重定向后的 URL
    redirectedUrl = page.url();
    console.log('重定向后的 URL:', redirectedUrl);
  } catch (error) {
    console.error('导航或重定向失败:', error.message);
    redirectedUrl = page.url();
  }

  await page.close();

  // 关闭浏览器
  await browser.close();

  const queryParams = new URL(redirectedUrl).searchParams;

  const code = queryParams.get('code');
  const state = queryParams.get('state');

  let accessToken = '';
  if (code && state) {
    // 获取访问令牌
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirect_uri,
      client_id: process.env.client_id,
      client_secret: process.env.client_secret,
      scope: scope,
    });
    const res = await axios
      .post('https://dida365.com/oauth/token', params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: process.env.cookie,
        },
      })
      .catch((error) => {
        console.log('🚀 ~ getAccessToken ~ error:', error.data);
      });

    accessToken = res.data.access_token;
  }

  return accessToken;
}

const accessToken = await getAccessToken();

// 定义请求头
const headers = new Headers({
  Authorization: `Bearer ${accessToken}`,
});

// 获取任务列表的函数
async function fetchProjects() {
  try {
    const response = await fetch(`https://api.dida365.com/open/v1/project`, {
      method: 'GET',
      headers: headers,
    });

    if (response.ok) {
      const tasks = await response.json();
      console.log(tasks);
      // 这里可以添加代码将任务数据显示在前端
    } else {
      console.error(`Failed to retrieve projects: ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

async function fetchProjectDetail(projectId) {
  try {
    const response = await fetch(
      `https://api.dida365.com/open/v1/project/${projectId}/data`,
      {
        method: 'GET',
        headers: headers,
      }
    );
    if (response.ok) {
      const tasks = await response.json();
      console.log(tasks);
    } else {
      console.error(`Failed to retrieve projects: ${response.status}`);
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

// 调用函数获取任务列表
// fetchTasks();
fetchProjectDetail('646f64d0ee91d104fd6e057e');
