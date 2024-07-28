
process
    .on('unhandledRejection', (reason, p) => {
        console.error(new Date(), reason, '\n', 'Unhandled Rejection at Promise', '\n', p);
    }).on('uncaughtException', err => {
        if(err.toString() == "TypeError: Cannot read property 'execute' of undefined") {
            return console.log("Uncaught Exception thrown ==> ", err.toString())
        }
        console.error(new Date(), 'Uncaught Exception thrown', '\n', err);
    });

    require("./loaders/module")();
    require("./loaders/express")();
    access_token = "test"
    const mongoConnect = require("./loaders/mongodb");
    dotenv.config();
    mongoConnect()
    console.log(access_token, "access_token");
    
    app.listen(process.env.port || 3000 , ()=>{
        console.log("Server Listen On port " ,process.env.port);
    })