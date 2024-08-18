
module.exports = () => {
  path = require("path");
  express = require("express");
  morgan = require("morgan");
  bodyParser = require("body-parser");
  mongoose = require('mongoose');
  dotenv = require("dotenv");
  axios = require("axios");
  access_token = "" ;
  refresh_token = "" ;
  UpstoxClient = require('upstox-js-sdk');

  // dotenv.config();
  // common function
  sendError  = require("./helper/responce").sendError ;
  sendSuccess = require("./helper/responce").sendSuccess ;
  rootServices = [].reduce((acc , next) => {
    acc[next.name] = next;
    return acc;
  }, {})
 
};


