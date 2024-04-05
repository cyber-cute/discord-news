const { model, Schema } = require('mongoose');

const newsSchema = model('NewsSchema',
    new Schema({
        guild: {
            type: String,
            required: true
        },
        channels: [{
            channel: {
                type: String,
                required: true
            },
            category: {
                type: String,
                required: true
            },
            previousTimePublished: {
                type: String,
            }
        }],
    })
);


module.exports = { newsSchema };
