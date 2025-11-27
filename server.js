require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3000;

// CWA API 設定
const CWA_API_BASE_URL = "https://opendata.cwa.gov.tw/api";
const CWA_API_KEY = process.env.CWA_API_KEY;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/**
 * 取得高雄天氣預報
 * CWA 氣象資料開放平臺 API
 * 使用「一般天氣預報-今明 36 小時天氣預報」資料集
 */
const getKaohsiungWeather = async (req, res) => {
  try {
    // 檢查是否有設定 API Key
    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 呼叫 CWA API - 一般天氣預報（36小時）
    // API 文件: https://opendata.cwa.gov.tw/dist/opendata-swagger.html
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: "臺中市",
        },
      }
    );

    // 取得高雄市的天氣資料
    const locationData = response.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: "無法取得高雄市天氣資料",
      });
    }

    // 整理天氣資料
    const weatherData = {
      city: locationData.locationName,
      updateTime: response.data.records.datasetDescription,
      forecasts: [],
    };

    // 解析天氣要素
    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
        windSpeed: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
          case "WS":
            forecast.windSpeed = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      // API 回應錯誤
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    // 其他錯誤
    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};

const getSunriseSunset = async (cityName) => {
  try {
    const response = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/A-B0062-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          CountyName: cityName,
        },
      }
    );

    const locationData = response.data.records.locations.location[0];
    const todayData = locationData.time[0]; // 假設只取今天的資料

    return {
      sunrise: todayData.SunRiseTime,
      sunset: todayData.SunSetTime,
    };
  } catch (error) {
    console.error("取得日出日落資料失敗:", error.message);
    return { sunrise: "未知", sunset: "未知" }; // 回傳預設值
  }
};

/**
 * 取得指定城市的天氣預報
 */
// const getCityWeather = async (req, res) => {
//   try {
//     const cityName = req.query.city || "臺中市"; // 預設為臺中市

//     if (!CWA_API_KEY) {
//       return res.status(500).json({
//         error: "伺服器設定錯誤",
//         message: "請在 .env 檔案中設定 CWA_API_KEY",
//       });
//     }

//     const response = await axios.get(
//       `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
//       {
//         params: {
//           Authorization: CWA_API_KEY,
//           locationName: cityName,
//         },
//       }
//     );

//     const locationData = response.data.records.location[0];

//     if (!locationData) {
//       return res.status(404).json({
//         error: "查無資料",
//         message: `無法取得 ${cityName} 天氣資料`,
//       });
//     }

//     const weatherData = {
//       city: locationData.locationName,
//       updateTime: response.data.records.datasetDescription,
//       forecasts: [],
//       sunrise: "06:00", // 假設固定值，需替換為真實 API 資料
//       sunset: "18:00", // 假設固定值，需替換為真實 API 資料
//     };

//     const weatherElements = locationData.weatherElement;
//     const timeCount = weatherElements[0].time.length;

//     for (let i = 0; i < timeCount; i++) {
//       const forecast = {
//         startTime: weatherElements[0].time[i].startTime,
//         endTime: weatherElements[0].time[i].endTime,
//         weather: "",
//         rain: "",
//         minTemp: "",
//         maxTemp: "",
//         comfort: "",
//       };

//       weatherElements.forEach((element) => {
//         const value = element.time[i].parameter;
//         switch (element.elementName) {
//           case "Wx":
//             forecast.weather = value.parameterName;
//             break;
//           case "PoP":
//             forecast.rain = value.parameterName + "%";
//             break;
//           case "MinT":
//             forecast.minTemp = value.parameterName + "°C";
//             break;
//           case "MaxT":
//             forecast.maxTemp = value.parameterName + "°C";
//             break;
//           case "CI":
//             forecast.comfort = value.parameterName;
//             break;
//         }
//       });

//       weatherData.forecasts.push(forecast);
//     }

//     res.json({
//       success: true,
//       data: weatherData,
//     });
//   } catch (error) {
//     console.error("取得天氣資料失敗:", error.message);

//     if (error.response) {
//       return res.status(error.response.status).json({
//         error: "CWA API 錯誤",
//         message: error.response.data.message || "無法取得天氣資料",
//         details: error.response.data,
//       });
//     }

//     res.status(500).json({
//       error: "伺服器錯誤",
//       message: "無法取得天氣資料，請稍後再試",
//     });
//   }
// };
const getCityWeather = async (req, res) => {
  try {
    const cityName = req.query.city || "台北市"; // 預設為台北市

    if (!CWA_API_KEY) {
      return res.status(500).json({
        error: "伺服器設定錯誤",
        message: "請在 .env 檔案中設定 CWA_API_KEY",
      });
    }

    // 呼叫天氣 API
    const weatherResponse = await axios.get(
      `${CWA_API_BASE_URL}/v1/rest/datastore/F-C0032-001`,
      {
        params: {
          Authorization: CWA_API_KEY,
          locationName: cityName,
        },
      }
    );

    const locationData = weatherResponse.data.records.location[0];

    if (!locationData) {
      return res.status(404).json({
        error: "查無資料",
        message: `無法取得 ${cityName} 天氣資料`,
      });
    }

    // 呼叫日出日落 API
    const { sunrise, sunset } = await getSunriseSunset(cityName);

    const weatherData = {
      city: locationData.locationName,
      updateTime: weatherResponse.data.records.datasetDescription,
      forecasts: [],
      sunrise,
      sunset,
    };

    const weatherElements = locationData.weatherElement;
    const timeCount = weatherElements[0].time.length;

    for (let i = 0; i < timeCount; i++) {
      const forecast = {
        startTime: weatherElements[0].time[i].startTime,
        endTime: weatherElements[0].time[i].endTime,
        weather: "",
        rain: "",
        minTemp: "",
        maxTemp: "",
        comfort: "",
      };

      weatherElements.forEach((element) => {
        const value = element.time[i].parameter;
        switch (element.elementName) {
          case "Wx":
            forecast.weather = value.parameterName;
            break;
          case "PoP":
            forecast.rain = value.parameterName + "%";
            break;
          case "MinT":
            forecast.minTemp = value.parameterName + "°C";
            break;
          case "MaxT":
            forecast.maxTemp = value.parameterName + "°C";
            break;
          case "CI":
            forecast.comfort = value.parameterName;
            break;
        }
      });

      weatherData.forecasts.push(forecast);
    }

    res.json({
      success: true,
      data: weatherData,
    });
  } catch (error) {
    console.error("取得天氣資料失敗:", error.message);

    if (error.response) {
      return res.status(error.response.status).json({
        error: "CWA API 錯誤",
        message: error.response.data.message || "無法取得天氣資料",
        details: error.response.data,
      });
    }

    res.status(500).json({
      error: "伺服器錯誤",
      message: "無法取得天氣資料，請稍後再試",
    });
  }
};
/**
 * 生成天氣分享內容
 */
const shareWeather = (req, res) => {
  const { city, weather, temperature } = req.query;

  if (!city || !weather || !temperature) {
    return res.status(400).json({
      error: "缺少參數",
      message: "請提供 city, weather, 和 temperature 參數",
    });
  }

  const shareContent = `目前在 ${city} 的天氣是 ${weather}，氣溫 ${temperature}。快來看看吧！`;

  res.json({
    success: true,
    shareContent,
  });
};

// Routes
app.get("/", (req, res) => {
  res.json({
    message: "歡迎使用 CWA 天氣預報 API",
    endpoints: {
      kaohsiung: "/api/weather/kaohsiung",
      health: "/api/health",
      cityWeather: "/api/weather?city=城市名稱",
      shareWeather: "/api/share?city=城市名稱&weather=天氣描述&temperature=氣溫",
    },
  });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// 取得高雄天氣預報
app.get("/api/weather/kaohsiung", getKaohsiungWeather);
app.get("/api/weather", getCityWeather);
app.get("/api/share", shareWeather);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "伺服器錯誤",
    message: err.message,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: "找不到此路徑",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 伺服器運行已運作`);
  console.log(`📍 環境: ${process.env.NODE_ENV || "development"}`);
});
