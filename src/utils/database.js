const mongoose = require('mongoose');

module.exports = (client) => {
    mongoose.connect(process.env.MONGO)
    .then(() => {
        console.log('Connected to MongoDB!');
    }).catch((err) => {
        console.log('Failed to connect to MongoDB!');
        console.log(err);
    });
}
