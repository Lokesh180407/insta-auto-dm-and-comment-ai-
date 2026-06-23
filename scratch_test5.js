const tok = process.env.INSTAGRAM_ACCESS_TOKEN || "EAAVXKRNv8EUBRtAPKA6H73ZCBsLYfZBZBPIeLFqZC3B4XjTZA34j59uPMcpvBDbAdkXg7ZBKvTVTYfzwEwSh7tbtyb3pyBBKMZBuqZC9prG2L5Ed82gFPfQMOkkZCYfzgeZBLotFYiesZBtGLHJObxLr7YOIEZCXjAVqZAUtS3WuNZBIUlhZBVZCR4TASuybBpnfDsiqP5XnqwFtMI03";
const v = "v24.0";

async function run() {
  const rAccounts = await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${tok}`);
  console.log(await rAccounts.json());
}
run().catch(console.error);
