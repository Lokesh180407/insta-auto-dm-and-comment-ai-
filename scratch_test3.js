const tok = "EAAVXKRNv8EUBRtAPKA6H73ZCBsLYfZBZBPIeLFqZC3B4XjTZA34j59uPMcpvBDbAdkXg7ZBKvTVTYfzwEwSh7tbtyb3pyBBKMZBuqZC9prG2L5Ed82gFPfQMOkkZCYfzgeZBLotFYiesZBtGLHJObxLr7YOIEZCXjAVqZAUtS3WuNZBIUlhZBVZCR4TASuybBpnfDsiqP5XnqwFtMI03";
const v = "v24.0";
async function run() {
  const r1 = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name&access_token=${tok}`);
  console.log("me:", await r1.json());
}
run().catch(console.error);
