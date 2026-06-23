const tok = "EAAVXKRNv8EUBRtAPKA6H73ZCBsLYfZBZBPIeLFqZC3B4XjTZA34j59uPMcpvBDbAdkXg7ZBKvTVTYfzwEwSh7tbtyb3pyBBKMZBuqZC9prG2L5Ed82gFPfQMOkkZCYfzgeZBLotFYiesZBtGLHJObxLr7YOIEZCXjAVqZAUtS3WuNZBIUlhZBVZCR4TASuybBpnfDsiqP5XnqwFtMI03";
const v = "v21.0";
async function run() {
  const res = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name,instagram_business_account&access_token=${tok}`);
  console.log("/me:", await res.json());
}
run().catch(console.error);
