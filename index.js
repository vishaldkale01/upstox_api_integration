const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

let = access_token = "", 
let = refresh_token = ""

// Redirect to Upstox login for authorization
app.get('/login', (req, res) => {
    const url = `https://api.upstox.com/v2/login/authorization/dialog?response_type=code&client_id=${process.env.UPSTOX_API_KEY}&redirect_uri=${encodeURIComponent(process.env.UPSTOX_REDIRECT_URI)}&state=""` 
    // const loginUrl = `https://api-v2.upstox.com/login?apiKey=${process.env.UPSTOX_API_KEY}&redirect_uri=${encodeURIComponent(process.env.UPSTOX_REDIRECT_URI)}&response_type=code`;

// const url = 'https://api.upstox.com/v2/login/authorization/token';
const headers = {
  'accept': 'application/json',
  'Content-Type': 'application/x-www-form-urlencoded',
};


    res.redirect(url);
// axios.post(url, new URLSearchParams(data), { headers })
//   .then(response => {
//     data.code = response.data.code
//     console.log(response.status);
//     console.log(response.data);
//   })
//   .catch(error => {
//     console.error(error.response.status);
//     console.error(error.response.data);
//   });
//   const loginUrl = `https://api-v2.upstox.com/login?apiKey=${process.env.UPSTOX_API_KEY}&redirect_uri=${process.env.UPSTOX_REDIRECT_URI}&response_type=code`;
});

// Handle the OAuth callback
app.get('/callback', async (req, res) => {
    const { code } = req.query;
    
const data = {
    'code' : code,
    'client_id': process.env.UPSTOX_API_KEY,
    'client_secret': process.env.UPSTOX_API_SECRET ,
    'redirect_uri':  process.env.UPSTOX_REDIRECT_URI ,
    'grant_type': 'authorization_code',
  }
  const url = 'https://api.upstox.com/v2/login/authorization/token';
const headers = {
    'accept': 'application/json',
    'Content-Type': 'application/x-www-form-urlencoded',
  };
    try {
      const response = await axios.post(url, new URLSearchParams(data), { headers });
     access_token  = response.data.access_token;
     refresh_token  = response.data.refresh_token;
      res.json({ access_token, refresh_token });
    } catch (error) {
      console.error('Error during authentication:', error.response ? error.response.data : error.message);
      res.status(500).send('Error during authentication.');
    }
  });
  

// Example endpoint to get market quotes
app.get('/market-quotes/:symbol', async (req, res) => {
  const { symbol } = req.params;
  console.log(access_token , "access_token");
//   const { access_token } = req.query;  // Assuming you pass the token as a query parameter
  try {
    const response = await axios.get(`https://api-v2.upstox.com/market/quotes?symbol=${symbol}`, {
      headers: {
        'Authorization': `Bearer ${access_token}`
      }
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).send('Error fetching market quotes.');
  }
});
app.get("/home",(req , res)=>{
    const url = 'https://api.upstox.com/v2/market-quote/ltp?instrument_key=NSE_EQ%7CINE848E01016';
const headers = {
  'Accept': 'application/json',
  'Authorization': `Bearer ${access_token}`
};

axios.get(url, { headers })
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error(error);
  });
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
