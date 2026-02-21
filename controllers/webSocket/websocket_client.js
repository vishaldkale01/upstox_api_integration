// Import required modules
var UpstoxClient = require("upstox-js-sdk");
const WebSocket = require("ws").WebSocket;
const protobuf = require("protobufjs");
const analyzeTrend = require("../../services/anylyser/analyzeTrend");

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

<<<<<<< HEAD:controller.js/webSocket/websocket_client.js
module.exports = { Initializewebsoket };
=======
// Function to establish WebSocket connection
const connectWebSocket = async (wsUrl) => {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl, {
      headers: {
        "Api-Version": apiVersion,
        Authorization: "Bearer " + OAUTH2.accessToken,
      },
      followRedirects: true,
    });

    // WebSocket event handlers
    ws.on("open", () => {
      console.log("connected socket connect successfully");
      resolve(ws); // Resolve the promise once connected

      // Set a timeout to send a subscription message after 1 second
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

    ws.on("message", (data) => {
      const decodedData = decodeProfobuf(data);
      console.log(JSON.stringify(decodedData));
      analyzeTrend(decodedData); // Add trend analysis for each message
    });

    ws.on("error", (error) => {
      console.log("error:", error);
      reject(error); // Reject the promise on error
    });
  });
};

// Function to initialize the protobuf part
const initProtobuf = async () => {
  protobufRoot = await protobuf.load(__dirname + "/MarketDataFeed.proto");
  console.log("Protobuf part initialization complete");
};

// Function to decode protobuf message
const decodeProfobuf = (buffer) => {
  if (!protobufRoot) {
    console.warn("Protobuf part not initialized yet!");
    return null;
  }

  const FeedResponse = protobufRoot.lookupType(
    "com.upstox.marketdatafeeder.rpc.proto.FeedResponse"
  );
  return FeedResponse.decode(buffer);
};

// Function to analyze market trend


// Initialize the protobuf part and establish the WebSocket connection
(async () => {
  try {
    await initProtobuf(); // Initialize protobuf
    const wsUrl = await getMarketFeedUrl(); // Get the market feed URL
    const ws = await connectWebSocket(wsUrl); // Connect to the WebSocket
  } catch (error) {
    console.error("An error occurred:", error);
  }
})();
}
module.exports = { Initializewebsoket };
>>>>>>> 245dfac9c53128c4851914611d7550ba5c3ae290:controllers/webSocket/websocket_client.js
