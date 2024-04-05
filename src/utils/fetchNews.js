const axios = require("axios");

async function fetchNews(category) {
    try {
        const newsData = await axios.get(`https://www.dexerto.com/_next/data/5Dz_UiVJXTWIp-h2oMbin/${category}.json`);
        return newsData.data.pageProps.vertical.posts[0];
    } catch (error) {
        console.error("Error fetching data from API:", error);
        throw new Error("API'den veri alınamadı");
    }
} 

module.exports = {
    fetchNews
}