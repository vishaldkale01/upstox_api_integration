const morgan = require("morgan")

module.exports = () =>{
app = express()
app.use(bodyParser.json())
// app.use(morgan('combined'))
dotenv.config();
app.use("/",require("../routes/index"))
}