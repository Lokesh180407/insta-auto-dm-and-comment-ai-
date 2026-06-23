const tok = process.env.INSTAGRAM_ACCESS_TOKEN || "EAAVXKRNv8EUBRtAPKA6H73ZCBsLYfZBZBPIeLFqZC3B4XjTZA34j59uPMcpvBDbAdkXg7ZBKvTVTYfzwEwSh7tbtyb3pyBBKMZBuqZC9prG2L5Ed82gFPfQMOkkZCYfzgeZBLotFYiesZBtGLHJObxLr7YOIEZCXjAVqZAUtS3WuNZBIUlhZBVZCR4TASuybBpnfDsiqP5XnqwFtMI03";
const v = "v24.0";

async function resolveIds(accessToken) {
  let facebookUserId = "N/A";
  let facebookPageId = null;
  let instagramAccountId = null;

  try {
    // Attempt 1: Assume it's a User Access Token
    const rAccounts = await fetch(`https://graph.facebook.com/${v}/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`);
    const dAccounts = await rAccounts.json();

    if (dAccounts.data) {
      // It IS a User Access Token. Let's get the User ID just for logging.
      const rMe = await fetch(`https://graph.facebook.com/${v}/me?fields=id&access_token=${accessToken}`);
      const dMe = await rMe.json();
      facebookUserId = dMe.id;

      // Find the Page that has an IG account
      for (const page of dAccounts.data) {
        if (page.instagram_business_account) {
          facebookPageId = page.id;
          instagramAccountId = page.instagram_business_account.id;
          break;
        }
      }
    } else {
      // Attempt 2: It's a Page Access Token
      const rMe = await fetch(`https://graph.facebook.com/${v}/me?fields=id,name,instagram_business_account&access_token=${accessToken}`);
      const dMe = await rMe.json();
      
      if (dMe.id) {
        facebookUserId = "N/A (Token is a Page Access Token)";
        facebookPageId = dMe.id;
        instagramAccountId = dMe.instagram_business_account?.id || null;
      }
    }

    console.log({
      facebookUserId,
      facebookPageId,
      instagramAccountId
    });
  } catch (err) {
    console.error(err);
  }
}

resolveIds(tok).catch(console.error);
