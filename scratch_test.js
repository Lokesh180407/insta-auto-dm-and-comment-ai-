const tok = "EAAVXKRNv8EUBRtAPKA6H73ZCBsLYfZBZBPIeLFqZC3B4XjTZA34j59uPMcpvBDbAdkXg7ZBKvTVTYfzwEwSh7tbtyb3pyBBKMZBuqZC9prG2L5Ed82gFPfQMOkkZCYfzgeZBLotFYiesZBtGLHJObxLr7YOIEZCXjAVqZAUtS3WuNZBIUlhZBVZCR4TASuybBpnfDsiqP5XnqwFtMI03";
const v = "v21.0";
async function run() {
  console.log("Checking token...");
  const res1 = await fetch(`https://graph.facebook.com/${v}/me?fields=name,id&access_token=${tok}`);
  console.log("/me:", await res1.json());
  
  const res2 = await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=name,id,instagram_business_account&access_token=${tok}`);
  const accounts = await res2.json();
  console.log("/me/accounts:", JSON.stringify(accounts, null, 2));
}
run().catch(console.error);
