// Import required modules
var UpstoxClient = require("upstox-js-sdk");
const WebSocket = require("ws").WebSocket;
const protobuf = require("protobufjs");

const Initializewebsoket = (access_token) => {
  let protobufRoot = null;
  let defaultClient = UpstoxClient.ApiClient.instance;
  let apiVersion = "3.0";
  let OAUTH2 = defaultClient.authentications["OAUTH2"];
  OAUTH2.accessToken = access_token;
  
  const getMarketFeedUrl = async () => {
    return new Promise((resolve, reject) => {
      const axios = require('axios');
      
      axios.get('https://api.upstox.com/v3/feed/market-data-feed/authorize', {
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Accept': 'application/json',
          'Api-Version': '3.0',
          'Content-Type': 'application/json'
        }
      })
      .then(response => {
        console.log("access_token:", access_token );
        console.log("Authorize response:", response.data);
        const wsUrl = response.data?.data?.authorized_redirect_uri;
        if (!wsUrl) {
          return reject(new Error("No authorized_redirect_uri in response"));
        }
        resolve(wsUrl);
      })
      .catch(error => {
        console.error("Authorize error:", error.response?.data || error.message);
        reject(error);
      });
    });
  };

  const connectWebSocket = async (wsUrl) => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl, {
        headers: {
          "Api-Version": apiVersion,
          Authorization: "Bearer " + OAUTH2.accessToken,
        },
        followRedirects: true,
      });
      console.log("Connecting to WebSocket URL:", wsUrl);
      ws.on("open", () => {
        console.log("connected socket connect successfully");
        resolve(ws);

        // setTimeout(() => {
          const data = {
            guid: "someguid",
            method: "sub",
            data: {
              mode: "full",
              instrumentKeys: ["NSE_INDEX|Nifty Bank", "NSE_INDEX|Nifty 50"],
            },
          };
          ws.send(Buffer.from(JSON.stringify(data)));
        // }, 1000);
      });

      ws.on("close", () => {
        console.log("disconnected");
      });

      // ✅ FIXED: Error-protected message handler
      ws.on("message", (data) => {
        try {
          console.log("Raw message received:", data);
          const decoded = decodeProfobuf(data);
          if (decoded) {
            console.log("✅ TICK DATA:", JSON.stringify(decoded, null, 2));
          }
        } catch (error) {
          console.error("Message handler error:", error.message);
        }
      });

      ws.on("error", (error) => {
        console.log("error:", error);
        reject(error);
      });
    });
  };

  const initProtobuf = async () => {
    protobufRoot = await protobuf.load(__dirname + "/MarketDataFeedV3.proto");
    console.log("Protobuf part initialization complete");
  };

  // ✅ FIXED: Correct type name
  const decodeProfobuf = (buffer) => {
    if (!protobufRoot) {
      console.warn("Protobuf part not initialized yet!");
      return null;
    }

    try {
      const FeedResponse = protobufRoot.lookupType(
        "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"  // ✅ package + message
      );
      return FeedResponse.decode(buffer);
    } catch (error) {
      console.error("Protobuf decode error:", error.message);
      return null;
    }
  };

  (async () => {
    try {
      await initProtobuf();
      const wsUrl = await getMarketFeedUrl();
      await connectWebSocket(wsUrl);
    } catch (error) {
      console.error("An error occurred:", error);
    }
  })();
};

module.exports = { Initializewebsoket };
