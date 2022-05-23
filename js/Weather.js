/*
README:https://github.com/VirgilClyne/iRingo
*/

const $ = new Env("Apple Weather v3.2.9");
const URL = new URLs();
const DataBase = {
	"Weather":{"Switch":true,"NextHour":{"Switch":true,"Mode":"www.weatherol.cn","HTTPHeaders":{"Content-Type":"application/x-www-form-urlencoded","User-Agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1"},"ColorfulClouds":{"Auth":null},},"AQI":{"Switch":true,"Mode":"WAQI Public","Location":"Station","Auth":null,"Scale":"EPA_NowCast.2204","Comparison":{"Switch":true,"Mode":"Cache"}},"Map":{"AQI":false}},
	"Siri":{"Switch":true,"CountryCode":"TW","Domains":["web","itunes","app_store","movies","restaurants","maps"],"Functions":["flightutilities","lookup","mail","messages","news","safari","siri","spotlight","visualintelligence"],"Safari_Smart_History":true},
	"Pollutants":{"co":"CO","no":"NO","no2":"NO2","so2":"SO2","o3":"OZONE","nox":"NOX","pm25":"PM2.5","pm10":"PM10","other":"OTHER"}
};
var { url } = $request;
var { body } = $response;

const WEATHER_TYPES = { CLEAR: "clear", RAIN: "rain", SNOW: "snow", SLEET: "sleet" };
const PRECIPITATION_LEVEL = { INVALID: -1, NO: 0, LIGHT: 1, MODERATE: 2, HEAVY: 3, STORM: 4 };

// https://docs.caiyunapp.com/docs/tables/precip
const RADAR_PRECIPITATION_RANGE = {
	NO: { LOWER: 0, UPPER: 0.031 },
	LIGHT: { LOWER: 0.031, UPPER: 0.25 },
	MODERATE: { LOWER: 0.25, UPPER: 0.35 },
	HEAVY: { LOWER: 0.35, UPPER: 0.48 },
	STORM: { LOWER: 0.48, UPPER: Number.MAX_VALUE },
};
const MMPERHR_PRECIPITATION_RANGE = {
	NO: { LOWER: 0, UPPER: 0.08 },
	LIGHT: { LOWER: 0.08, UPPER: 3.44 },
	MODERATE: { LOWER: 3.44, UPPER: 11.33 },
	HEAVY: { LOWER: 11.33, UPPER: 51.30 },
	STORM: { LOWER: 51.30, UPPER: Number.MAX_VALUE },
};

const WEATHER_STATUS = {
	// precipIntensityPerceived <= 0
	CLEAR: "clear",

	// precipIntensityPerceived < 1
	DRIZZLE: "drizzle",
	FLURRIES: "flurries",
	SLEET: "sleet",

	// between
	RAIN: "rain",
	SNOW: "snow",

	// precipIntensityPerceived > 2
	HEAVY_RAIN: "heavy-rain",
	// TODO: untested, check if it is `heavy-snow`
	HEAVY_SNOW: "heavy-snow",
};

const POLLUTANT_UNITS_TEXT = {
	PPM: "ppm", PPB: "ppb", MG_M3: "milligramsPerM3", UG_M3: "microgramsPerM3",
};

const POLLUTANT_UNITS = {
	TEXT: POLLUTANT_UNITS_TEXT,
	SLASH: { ...POLLUTANT_UNITS_TEXT, MG_M3: "mg/m3", UG_M3: "µg/m3" },
}

const AQI_COMPARISON = { UNKNOWN: "unknown", WORSE: "worse", SAME: "same", BETTER: "better" };

// https://www.govinfo.gov/content/pkg/CFR-2011-title40-vol2/pdf/CFR-2011-title40-vol2-chapI.pdf
// https://cfpub.epa.gov/ncer_abstracts/index.cfm/fuseaction/display.files/fileid/14285
const EPA_TEMPERATURE_CELSIUS = 25;

// EPA 454/B-18-007
// https://www.airnow.gov/sites/default/files/2020-05/aqi-technical-assistance-document-sept2018.pdf
const EPA_454 = {
	IOS_SCALE: "EPA_NowCast.2204",

	AQI_LEVELS: {
		INVALID: -1,
		GOOD: 1,
		MODERATE: 2,
		UNHEALTHY_SENSETIVE: 3,
		UNHEALTHY: 4,
		VERY_UNHEALTHY: 5,
		HAZARDOUS: 6,
		// meanless for user
		VERY_HAZARDOUS: 6,
		OVER_RANGE: 7,
	},
	// unhealthy for sensetive groups
	SIGNIFICANT_LEVEL: 3,

	AQI_RANGES: {
		GOOD: { LOWER: 0, UPPER: 50 },
		MODERATE: { LOWER: 51, UPPER: 100 },
		UNHEALTHY_SENSETIVE: { LOWER: 101, UPPER: 150 },
		UNHEALTHY: { LOWER: 151, UPPER: 200 },
		VERY_UNHEALTHY: { LOWER: 201, UPPER: 300 },
		HAZARDOUS: { LOWER: 301, UPPER: 400 },
		VERY_HAZARDOUS: { LOWER: 401, UPPER: 500 },
	},

	CONCENTRATION_UNITS: {
		"OZONE": POLLUTANT_UNITS.TEXT.PPM, "OZONE_8H": POLLUTANT_UNITS.TEXT.PPM,
		"PM2.5_24H": POLLUTANT_UNITS.TEXT.UG_M3, "PM10_24H": POLLUTANT_UNITS.TEXT.UG_M3,
		"CO_8H": POLLUTANT_UNITS.TEXT.PPM, "SO2": POLLUTANT_UNITS.TEXT.PPB,
		"SO2_24H": POLLUTANT_UNITS.TEXT.PPB, "NO2": POLLUTANT_UNITS.TEXT.PPB,
	},

	CONCENTRATION_BREAKPOINTS: {
		"OZONE": {
			// unit: ppm
			UNHEALTHY_SENSETIVE: { LOWER: 0.125, UPPER: 0.164 },
			UNHEALTHY: { LOWER: 0.165, UPPER: 0.204 },
			VERY_UNHEALTHY: { LOWER: 0.205, UPPER: 0.404 },
			HAZARDOUS: { LOWER: 0.405, UPPER: 0.504 },
			VERY_HAZARDOUS: { LOWER: 0.505, UPPER: 0.604 },
		},
		"OZONE_8H": {
			// unit: ppm
			GOOD: { LOWER: 0.000, UPPER: 0.054 },
			MODERATE: { LOWER: 0.055, UPPER: 0.070 },
			UNHEALTHY_SENSETIVE: { LOWER: 0.071, UPPER: 0.085 },
			UNHEALTHY: { LOWER: 0.086, UPPER: 0.105 },
			VERY_UNHEALTHY: { LOWER: 0.106, UPPER: 0.200 },
		},
		"PM2.5_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0.0, UPPER: 12.0 },
			MODERATE: { LOWER: 12.1, UPPER: 35.4 },
			// if a different SHL for PM2.5 is promulgated, the following numbers will change accordingly.
			UNHEALTHY_SENSETIVE: { LOWER: 35.5, UPPER: 55.4 },
			UNHEALTHY: { LOWER: 55.5, UPPER: 150.4 },
			VERY_UNHEALTHY: { LOWER: 150.5, UPPER: 250.4 },
			HAZARDOUS: { LOWER: 250.5, UPPER: 350.4 },
			VERY_HAZARDOUS: { LOWER: 350.5, UPPER: 500.4 },
		},
		"PM10_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 54 },
			MODERATE: { LOWER: 55, UPPER: 154 },
			UNHEALTHY_SENSETIVE: { LOWER: 155, UPPER: 254 },
			UNHEALTHY: { LOWER: 255, UPPER: 354 },
			VERY_UNHEALTHY: { LOWER: 355, UPPER: 424 },
			HAZARDOUS: { LOWER: 425, UPPER: 504 },
			VERY_HAZARDOUS: { LOWER: 505, UPPER: 604 },
		},
		"CO_8H": {
			// unit: ppm
			GOOD: { LOWER: 0.0, UPPER: 4.4 },
			MODERATE: { LOWER: 4.5, UPPER: 9.4 },
			UNHEALTHY_SENSETIVE: { LOWER: 9.5, UPPER: 12.4 },
			UNHEALTHY: { LOWER: 12.5, UPPER: 15.4 },
			VERY_UNHEALTHY: { LOWER: 15.5, UPPER: 30.4 },
			HAZARDOUS: { LOWER: 30.5, UPPER: 40.4 },
			VERY_HAZARDOUS: { LOWER: 40.5, UPPER: 50.4 },
		},
		"SO2": {
			// unit: ppb
			GOOD: { LOWER: 0, UPPER: 35 },
			MODERATE: { LOWER: 36, UPPER: 75 },
			UNHEALTHY_SENSETIVE: { LOWER: 76, UPPER: 185 },
			// 1-hour SO2 values do not define higher AQI values (≥ 200).
			// AQI values of 200 or greater are calculated with 24-hour SO2 concentrations.
		},
		"SO2_24H": {
			// unit: ppb
			UNHEALTHY: { LOWER: 186, UPPER: 304 },
			VERY_UNHEALTHY: { LOWER: 305, UPPER: 604 },
			HAZARDOUS: { LOWER: 605, UPPER: 804 },
			VERY_HAZARDOUS: { LOWER: 805, UPPER: 1004 },
		},
		"NO2": {
			// unit: ppb
			GOOD: { LOWER: 0, UPPER: 53 },
			MODERATE: { LOWER: 54, UPPER: 100 },
			UNHEALTHY_SENSETIVE: { LOWER: 101, UPPER: 360 },
			UNHEALTHY: { LOWER: 361, UPPER: 649 },
			VERY_UNHEALTHY: { LOWER: 650, UPPER: 1249 },
			HAZARDOUS: { LOWER: 1250, UPPER: 1649 },
			VERY_HAZARDOUS: { LOWER: 1650, UPPER: 2049 },
		},
	},
};

// HJ 633——2012
// https://www.mee.gov.cn/ywgz/fgbz/bz/bzwb/jcffbz/201203/W020120410332725219541.pdf
const HJ_633 = {
	IOS_SCALE: "HJ6332012.2204",
	AQI_LEVELS: EPA_454.AQI_LEVELS,
	SIGNIFICANT_LEVEL: EPA_454.SIGNIFICANT_LEVEL,
	AQI_RANGES: EPA_454.AQI_RANGES,

	CONCENTRATION_UNITS: {
		"SO2_24H": POLLUTANT_UNITS.TEXT.UG_M3, "SO2": POLLUTANT_UNITS.TEXT.UG_M3,
		"NO2_24H": POLLUTANT_UNITS.TEXT.UG_M3, "NO2": POLLUTANT_UNITS.TEXT.UG_M3,
		"PM10_24H": POLLUTANT_UNITS.TEXT.UG_M3, "CO_24H": POLLUTANT_UNITS.TEXT.MG_M3,
		"CO": POLLUTANT_UNITS.TEXT.MG_M3, "OZONE": POLLUTANT_UNITS.TEXT.UG_M3,
		"OZONE_8H": POLLUTANT_UNITS.TEXT.UG_M3, "PM2.5_24H": POLLUTANT_UNITS.TEXT.UG_M3,
	},

	CONCENTRATION_BREAKPOINTS: {
		"SO2_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 50 },
			MODERATE: { LOWER: 51, UPPER: 150 },
			UNHEALTHY_SENSETIVE: { LOWER: 151, UPPER: 475 },
			UNHEALTHY: { LOWER: 476, UPPER: 800 },
			VERY_UNHEALTHY: { LOWER: 801, UPPER: 1600 },
			HAZARDOUS: { LOWER: 1601, UPPER: 2100 },
			VERY_HAZARDOUS: { LOWER: 2101, UPPER: 2620 },
		},
		"SO2": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 150 },
			MODERATE: { LOWER: 151, UPPER: 500 },
			UNHEALTHY_SENSETIVE: { LOWER: 501, UPPER: 650 },
			UNHEALTHY: { LOWER: 651, UPPER: 800 },
			// 二氧化硫（SO2）1小时平均浓度高于800 ug/m3的，不再进行其空气质量分指数计算，二氧化硫（SO2）空气质量分指数按24小时平均浓度计算的分指数报告。
		},
		"NO2_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 40 },
			MODERATE: { LOWER: 41, UPPER: 80 },
			UNHEALTHY_SENSETIVE: { LOWER: 81, UPPER: 180 },
			UNHEALTHY: { LOWER: 181, UPPER: 280 },
			VERY_UNHEALTHY: { LOWER: 281, UPPER: 565 },
			HAZARDOUS: { LOWER: 566, UPPER: 750 },
			VERY_HAZARDOUS: { LOWER: 751, UPPER: 940 },
		},
		"NO2": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 100 },
			MODERATE: { LOWER: 101, UPPER: 200 },
			UNHEALTHY_SENSETIVE: { LOWER: 201, UPPER: 700 },
			UNHEALTHY: { LOWER: 701, UPPER: 1200 },
			VERY_UNHEALTHY: { LOWER: 1201, UPPER: 2340 },
			HAZARDOUS: { LOWER: 2341, UPPER: 3090 },
			VERY_HAZARDOUS: { LOWER: 3091, UPPER: 3840 },
		},
		"PM10_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 50 },
			MODERATE: { LOWER: 51, UPPER: 150 },
			UNHEALTHY_SENSETIVE: { LOWER: 151, UPPER: 250 },
			UNHEALTHY: { LOWER: 251, UPPER: 350 },
			VERY_UNHEALTHY: { LOWER: 351, UPPER: 420 },
			HAZARDOUS: { LOWER: 421, UPPER: 500 },
			VERY_HAZARDOUS: { LOWER: 501, UPPER: 600 },
		},
		"CO_24H": {
			// unit: mg/m3
			GOOD: { LOWER: 0, UPPER: 2 },
			MODERATE: { LOWER: 3, UPPER: 4 },
			UNHEALTHY_SENSETIVE: { LOWER: 5, UPPER: 14 },
			UNHEALTHY: { LOWER: 15, UPPER: 24 },
			VERY_UNHEALTHY: { LOWER: 25, UPPER: 36 },
			HAZARDOUS: { LOWER: 37, UPPER: 48 },
			VERY_HAZARDOUS: { LOWER: 49, UPPER: 60 },
		},
		"CO": {
			// unit: mg/m3
			GOOD: { LOWER: 0, UPPER: 5 },
			MODERATE: { LOWER: 6, UPPER: 10 },
			UNHEALTHY_SENSETIVE: { LOWER: 11, UPPER: 35 },
			UNHEALTHY: { LOWER: 36, UPPER: 60 },
			VERY_UNHEALTHY: { LOWER: 61, UPPER: 90 },
			HAZARDOUS: { LOWER: 91, UPPER: 120 },
			VERY_HAZARDOUS: { LOWER: 121, UPPER: 150 },
		},
		"OZONE": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 160 },
			MODERATE: { LOWER: 161, UPPER: 200 },
			UNHEALTHY_SENSETIVE: { LOWER: 201, UPPER: 300 },
			UNHEALTHY: { LOWER: 301, UPPER: 400 },
			VERY_UNHEALTHY: { LOWER: 401, UPPER: 800 },
			HAZARDOUS: { LOWER: 801, UPPER: 1000 },
			VERY_HAZARDOUS: { LOWER: 1001, UPPER: 1200 },
		},
		"OZONE_8H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 100 },
			MODERATE: { LOWER: 101, UPPER: 160 },
			UNHEALTHY_SENSETIVE: { LOWER: 161, UPPER: 215 },
			UNHEALTHY: { LOWER: 216, UPPER: 265 },
			VERY_UNHEALTHY: { LOWER: 266, UPPER: 800 },
			// 臭氧（O3）8小时平均浓度值高于800 ug/m3的，不再进行其空气质量分指数计算，臭氧（O3）空气质量分指数按1小时平均浓度计算的分指数报告。
		},
		"PM2.5_24H": {
			// unit: ug/m3
			GOOD: { LOWER: 0, UPPER: 35 },
			MODERATE: { LOWER: 36, UPPER: 75 },
			UNHEALTHY_SENSETIVE: { LOWER: 76, UPPER: 115 },
			UNHEALTHY: { LOWER: 116, UPPER: 150 },
			VERY_UNHEALTHY: { LOWER: 151, UPPER: 250 },
			HAZARDOUS: { LOWER: 251, UPPER: 350 },
			VERY_HAZARDOUS: { LOWER: 351, UPPER: 500 },
		},
	},
};

// https://aqicn.org/scale/
const WAQI_INSTANT_CAST = {
	IOS_SCALE: EPA_454.IOS_SCALE,
	AQI_LEVELS: EPA_454.AQI_LEVELS,
	SIGNIFICANT_LEVEL: EPA_454.SIGNIFICANT_LEVEL,
	AQI_RANGES: EPA_454.AQI_RANGES,

	CONCENTRATION_UNITS: {
		...EPA_454.CONCENTRATION_UNITS,
		"OZONE": POLLUTANT_UNITS.TEXT.PPB,
		"PM2.5": EPA_454.CONCENTRATION_UNITS["PM2.5_24H"],
		"PM10": EPA_454.CONCENTRATION_UNITS["PM10_24H"],
		"CO": EPA_454.CONCENTRATION_UNITS["CO_8H"],
		"OZONE_8H": undefined,
		"PM2.5_24H": undefined,
		"PM10_24H": undefined,
		"CO_8H": undefined,
		"SO2_24H": undefined,
	},

	CONCENTRATION_BREAKPOINTS: {
		...EPA_454.CONCENTRATION_BREAKPOINTS,
		// https://aqicn.org/faq/2016-08-10/ozone-aqi-scale-update/
		"OZONE": {
			// unit: ppb
			GOOD: { LOWER: 0, UPPER: 61.5 },
			MODERATE: { LOWER: 62.5, UPPER: 100.5 },
			UNHEALTHY_SENSETIVE: { LOWER: 101.5, UPPER: 151.5 },
			UNHEALTHY: { LOWER: 152.5, UPPER: 204 },
			VERY_UNHEALTHY: { LOWER: 205, UPPER: 404 },
			HAZARDOUS: { LOWER: 405, UPPER: 504 },
			VERY_HAZARDOUS: { LOWER: 505, UPPER: 604 },
		},
		"PM2.5": EPA_454.CONCENTRATION_BREAKPOINTS["PM2.5_24H"],
		"PM10": EPA_454.CONCENTRATION_BREAKPOINTS["PM10_24H"],
		"CO": EPA_454.CONCENTRATION_BREAKPOINTS["CO_8H"],
		"OZONE_8H": undefined,
		"PM2.5_24H": undefined,
		"PM10_24H": undefined,
		"CO_8H": undefined,
		"SO2_24H": undefined,
	},
};

/***************** Processing *****************/
!(async () => {
	const { Settings, Caches } = await setENV("iRingo", "Weather", DataBase);
	if (Settings.Switch) {
		url = URL.parse(url);
		const Params = await getParams(url.path);
		let data = JSON.parse(body);
		const Status = await getStatus(data);
		// AQI
		if (Settings.AQI.Switch) {
			if (url.params?.include?.includes("air_quality") || url.params?.dataSets?.includes("airQuality")) {
				if (Status == true) {
					$.log(`🎉 ${$.name}, 需要替换AQI`, "");
					let AIR_QUALITY;
					switch (Params.ver) {
						case "v1":
							AIR_QUALITY = "air_quality";
							break;
						case "v2":
						default:
							AIR_QUALITY = "airQuality";
							break;
					}
					const airQuality = data[AIR_QUALITY];
					let modifiedAirQuality = { "metadata": {}, "pollutants": {} };

					if (Settings.AQI.Mode === "Local") {
						$.log(`🚧 ${$.name}, 工作模式：本地转换`, "");

						if (airQuality) {
							modifiedAirQuality = await outputAqi(
								// TODO
								Params.ver, appleAqiConverter(WAQI_INSTANT_CAST, airQuality),
							);
						}
					} else if (Settings.AQI.Mode == "WAQI Public") {
						$.log(`🚧 ${$.name}, 工作模式: waqi.info 公共API`, "")
						var { Station, idx } = await WAQI("Nearest", { api: "v1", lat: Params.lat, lng: Params.lng });
						const Token = await WAQI("Token", { idx: idx });
						//var NOW = await WAQI("NOW", { token:Token, idx: idx });
						const feedData = await WAQI("AQI", { token: Token, idx: idx });
						modifiedAirQuality = await outputAqi(
							Params.ver, waqiToAqi(feedData),
						);
					} else if (Settings.AQI.Mode == "WAQI Private") {
						$.log(`🚧 ${$.name}, 工作模式: waqi.info 私有API`, "")
						const Token = Settings.AQI.Auth;
						if (Settings.AQI.Location == "Station") {
							$.log(`🚧 ${$.name}, 定位精度: 观测站`, "")
							var { Station, idx } = await WAQI("Nearest", { api: "v1", lat: Params.lat, lng: Params.lng });
							const feedData = await WAQI("StationFeed", { token: Token, idx: idx });
							modifiedAirQuality = await outputAqi(
								Params.ver, waqiToAqi(feedData),
							);
						} else if (Settings.AQI.Location == "City") {
							$.log(`🚧 ${$.name}, 定位精度: 城市`, "")
							const feedData = await WAQI("CityFeed", { token: Token, lat: Params.lat, lng: Params.lng });
							modifiedAirQuality = await outputAqi(
								Params.ver, waqiToAqi(feedData),
							);
						}
					};

					data[AIR_QUALITY] = {
						...airQuality,
						...modifiedAirQuality,
						"metadata": { ...airQuality?.metadata, ...modifiedAirQuality.metadata },
						"pollutants": { ...airQuality?.pollutants, ...modifiedAirQuality.pollutants },
					};

					const aqi = data[AIR_QUALITY]?.index;
					if (
						// APIv1 doesn't support previousDayComparison
						Settings.AQI?.Comparison?.Switch && typeof aqi === "number" && aqi >= 0
							&& data[AIR_QUALITY]?.previousDayComparison === AQI_COMPARISON.UNKNOWN
					) {
						const metadata = data[AIR_QUALITY]?.metadata;
						const nowHourTimestamp = (+ (new Date()).setMinutes(0, 0, 0));

						let reportedTimestamp;
						switch (Params.ver) {
							case "v1":
								reportedTimestamp = metadata["reported_time"]
									? metadata["reported_time"] * 1000 : nowHourTimestamp;
								break;
							case "v2":
							default:
								reportedTimestamp = metadata["reportedTime"]
									? (+ new Date(metadata["reportedTime"])) : nowHourTimestamp;
								break;
						}

						cacheAqi(
							Caches,
							reportedTimestamp,
							{ longitude: metadata.longitude, latitude: metadata.latitude },
							data[AIR_QUALITY].source,
							aqi,
						);

						// add 45 minutes for possible data delay
						const yesterdayTimestamp = reportedTimestamp - 1000 * 60 * 60 * 24 + 1000 * 60 * 45;

						if (Caches?.aqi) {
							const nowHour = (new Date()).getHours;

							const key = Object.keys(Caches.aqi).find(timestamp =>
								(new Date(timestamp)).getHours === nowHour
							);

							const cache = Caches.aqi[key].find(value =>
								// cannot get station name
								["和风天气", "QWeather", "BreezoMeter"].includes(data[AIR_QUALITY]?.source)
									// https://www.mee.gov.cn/gkml/hbb/bwj/201204/W020140904493567314967.pdf
									? Math.abs(value?.location?.longitude - metadata.longitude) < 0.045
											&& Math.abs(value?.location?.latitude - metadata.latitude) < 0.045
									: value.stationName === data[AIR_QUALITY]?.source
							);

							data[AIR_QUALITY].previousDayComparison =
								compareAqi(cache.aqi, data[AIR_QUALITY].index);
						}

						// no cache data
						if (data[AIR_QUALITY]?.previousDayComparison === AQI_COMPARISON.UNKNOWN) {
							switch (Settings.AQI?.Comparison?.Mode) {
								case "api.caiyunapp.com":
									const token = Settings.NextHour?.ColorfulClouds?.Auth;
	
									if (token) {
										const aqiData = await colorfulClouds(
											Settings.NextHour?.HTTPHeaders,
											// TODO
											"v2.6",
											token,
											{ latitude: Params.lat, longitude: Params.lng },
											"weather",
											// ms to s
											{ "unit": "metric:v2", "hourlysteps": 1, "begin": yesterdayTimestamp / 1000 },
										);
	
										if (
											aqiData?.result?.realtime?.air_quality?.aqi?.usa
												&& aqiData?.result?.hourly?.air_quality?.aqi?.[0]?.value?.usa
										) {
											const currentAqi = parseInt(aqiData.result.realtime.air_quality.aqi.usa);
											const yesterdayAqi =
												parseInt(aqiData.result.hourly.air_quality.aqi[0].value.usa);
	
											if (!isNaN(currentAqi) && !isNaN(yesterdayAqi)) {
												$.log(
													`🚧 ${$.name}, 比较昨天AQI（彩云天气）：`,
													`当前AQI：${currentAqi}`,
													`${aqiData.result.hourly.air_quality.aqi[0].datetime}时的AQI：${yesterdayAqi}`,
													"",
												);
	
												data[AIR_QUALITY].previousDayComparison =
													compareAqi(currentAqi, yesterdayAqi);
												break;
											}
										}
									}
								default:
									break;
							}
						}
					}
					$.log(`🚧 ${$.name}, data[${AIR_QUALITY}] = ${JSON.stringify(data[AIR_QUALITY])}`, "");
				} else $.log(`🎉 ${$.name}, 无须替换, 跳过`, "");
			}
		};
		// NextHour
		if (Settings.NextHour.Switch) {
			if (
				url.params?.dataSets?.includes("forecastNextHour") ||
				url.params?.include?.includes("next_hour_forecast")
			) {
				$.log(
					`🚧 ${$.name}, 下小时降水强度, ` +
					`providerName = ${
						data?.forecastNextHour?.providerName ?? data?.next_hour?.provider_name
					}`, ""
				);

				if (!(data?.forecastNextHour?.metadata?.providerName || data?.next_hour?.provider_name)) {
					const NEXT_HOUR = (Params.ver === "v1") ? "next_hour" : "forecastNextHour";
					if (Settings.NextHour?.Mode === "api.caiyunapp.com") {
						const CC_API_VERSION = "v2.6";
						const token = Settings.NextHour?.ColorfulClouds?.Auth;
						const languageWithReigon = Params.language;

						if (token) {
							// No official name for Japanese
							let providerName = "ColorfulClouds";
							if (languageWithReigon.includes("zh-Hans")) {
								providerName = "彩云天气";
							} else if (languageWithReigon.includes("zh-Hant")) {
								providerName = "彩雲天氣";
							}

							const weatherData = await colorfulClouds(
								Settings.NextHour?.HTTPHeaders,
								CC_API_VERSION,
								token,
								{ latitude: Params.lat, longitude: Params.lng },
								// get hourly.skycon data to detect the weather type
								"weather",
								// unit for calculate precipitations
								// https://docs.caiyunapp.com/docs/tables/precip
								{ "unit": "metric:v2", "lang": toColorfulCloudsLang(languageWithReigon) },
							);

							// no data for current location, skip
							if (
								weatherData &&
								weatherData?.result?.minutely?.datasource &&
								weatherData.result.minutely.datasource !== "gfs"
							) {
								data[NEXT_HOUR] = await outputNextHour(
									Params.ver,
									colorfulCloudsToNextHour(
										providerName,
										weatherData.result?.hourly?.skycon,
										weatherData,
									),
									null,
								);
							}
						}
					} else {
						const providerName = "气象在线";
						const weatherData = await weatherOl(
              Settings.NextHour?.HTTPHeaders,
              "forecast",
              { latitude: Params.lat, longitude: Params.lng },
            );

						// no data for current location, skip
						if (
							weatherData &&
							weatherData?.result?.minutely?.datasource &&
							weatherData.result.minutely.datasource !== "gfs"
						) {
							data[NEXT_HOUR] = await outputNextHour(
								Params.ver,
								colorfulCloudsToNextHour(
									providerName,
									weatherData.result?.hourly?.skycon,
									weatherData,
								),
								null,
							);
						}
					}

					if (!(
						data?.forecastNextHour?.metadata?.providerName ||
						data?.next_hour?.provider_name
					)) {
						$.log(`🚧 ${$.name}, 没有找到合适的API, 跳过`, "");
					}
				} else {
					//$.log(`🚧 ${$.name}, data = ${JSON.stringify(data?.forecastNextHour ?? data?.next_hour)}`, "");
					$.log(`🎉 ${$.name}, 已有下一小时降水强度信息, 跳过`, "");
				}
			}
		};
		body = JSON.stringify(data);
	}
})()
	.catch((e) => $.logErr(e))
	.finally(() => $.done({ body }))

/***************** Async Function *****************/
/**
 * Get Environment Variables
 * @author VirgilClyne
 * @param {String} t - Persistent Store Key
 * @param {String} e - Platform Name
 * @param {Object} n - Default DataBase
 * @return {Promise<*>}
 */
async function getENV(t,e,n){let i=$.getjson(t,n),s=i?.[e]?.Settings||n?.[e]?.Settings||n?.Default?.Settings,g=i?.[e]?.Configs||n?.[e]?.Configs||n?.Default?.Configs,f=i?.[e]?.Caches||void 0;if("string"==typeof f&&(f=JSON.parse(f)),"undefined"!=typeof $argument){if($argument){let t=Object.fromEntries($argument.split("&").map((t=>t.split("=")))),e={};for(var a in t)o(e,a,t[a]);Object.assign(s,e)}function o(t,e,n){e.split(".").reduce(((t,i,s)=>t[i]=e.split(".").length===++s?n:t[i]||{}),t)}}return{Settings:s,Caches:f,Configs:g}}

/**
 * Set Environment Variables
 * @author VirgilClyne
 * @param {String} name - Persistent Store Key
 * @param {String} platform - Platform Name
 * @param {Object} database - Default DataBase
 * @return {Promise<*>}
 */
 async function setENV(name, platform, database) {
	$.log(`⚠ ${$.name}, Set Environment Variables`, "");
	const { Settings, Caches = {} } = await getENV(name, platform, database);
	/***************** Prase *****************/
	Settings.Switch = JSON.parse(Settings.Switch) // BoxJs字符串转Boolean
	Settings.NextHour.Switch = JSON.parse(Settings.NextHour.Switch) // BoxJs字符串转Boolean
	Settings.NextHour.HTTPHeaders = typeof Settings.NextHour?.HTTPHeaders === "string" ||
		Settings.NextHour?.HTTPHeaders instanceof String ?
			JSON.parse(Settings.NextHour.HTTPHeaders) : database.Weather.NextHour.HTTPHeaders // BoxJs字符串转Object
	Settings.AQI.Switch = JSON.parse(Settings.AQI.Switch) // BoxJs字符串转Boolean
	Settings.AQI.Comparison = Settings.AQI?.Comparison ?? database.Weather.AQI.Comparison
	Settings.AQI.Comparison.Switch = typeof Settings.AQI.Comparison?.Switch === "boolean"
		? Settings.AQI.Comparison.Switch : JSON.parse(Settings.AQI.Comparison.Switch) // BoxJs字符串转Boolean
	Settings.Map.AQI = JSON.parse(Settings.Map.AQI) // BoxJs字符串转Boolean
	$.log(`🎉 ${$.name}, Set Environment Variables`, `Settings: ${typeof Settings}`, `Settings内容: ${JSON.stringify(Settings)}`, "");
	return { Settings, Caches, Configs }
};

/**
 * Get Origin Parameters
 * @author VirgilClyne
 * @param {String} url - Request URL
 * @return {Promise<*>}
 */
async function getParams(path) {
	const Regular = /^(?<ver>v1|v2)\/weather\/(?<language>[\w-_]+)\/(?<lat>-?\d+\.\d+)\/(?<lng>-?\d+\.\d+).*(?<countryCode>country=[A-Z]{2})?.*/i;
	const Params = path.match(Regular).groups;
	// TODO: add debug switch (lat, lng)
	$.log(`🚧 ${$.name}`, `Params: ${JSON.stringify(Params)}`, "");
	return Params
};

/**
 * Get AQI Source Status
 * @author VirgilClyne
 * @param {Object} data - Parsed response body JSON
 * @return {Promise<*>}
 */
async function getStatus(data) {
	const result = ["和风天气", "QWeather"].includes(data.air_quality?.metadata?.provider_name ?? data.airQuality?.metadata?.providerName ?? "QWeather");
	$.log(`🚧 ${$.name}, providerName = ${data.air_quality?.metadata?.provider_name ?? data.airQuality?.metadata?.providerName}`, '');
	return (result || false)
};

/**
 * WAQI
 * @author VirgilClyne
 * @param {String} type - type
 * @param {Object} input - verify
 * @return {Promise<*>}
 */
async function WAQI(type = "", input = {}) {
	// TODO: add debug switch (lat, lng)
	$.log(`⚠ ${$.name}, WAQI`, `input: ${JSON.stringify(input)}`, "");
	// 构造请求
	let request = await GetRequest(type, input);
	// 发送请求
	let output = await GetData(type, request);
	//$.log(`🚧 ${$.name}, WAQI`, `output: ${JSON.stringify(output)}`, "");
	return output
	/***************** Fuctions *****************/
	async function GetRequest(type = "", input = { api: "v2", lat: 0, lng: 0, idx: 0, token: "na" }) {
		$.log(`⚠ ${$.name}, Get WAQI Request, type: ${type}`, "");
		let request = {
			"url": "https://api.waqi.info",
			"headers": {
				"Content-Type": "application/x-www-form-urlencoded",
				"Origin": "https://waqi.info",
				"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1",
				"Referer": "https://waqi.info/"
			}
		};
		if (type == "Nearest") {
			$.log('获取最近站点');
			if (input.api == "v1") mapq = "mapq";
			else if (input.api == "v2") mapq = "mapq2";
			request.url = `${request.url}/${mapq}/nearest?n=1&geo=1/${input.lat}/${input.lng}`;
		} else if (type == "Token") {
			$.log('获取令牌');
			request.url = `${request.url}/api/token/${input.idx}`
		} else if (type == "NOW") {
			$.log('获取即时信息');
			request.url = `${request.url}/api/feed/@${input.idx}/now.json`
			request.body = `token=${input.token}&id=${input.idx}`
		} else if (type == "AQI") {
			$.log('获取空气质量信息');
			request.url = `${request.url}/api/feed/@${input.idx}/aqi.json`
			request.body = `token=${input.token}&id=${input.idx}`
		} else if (type == "CityFeed") {
			$.log('获取城市信息');
			request.url = `${request.url}/feed/geo:${input.lat};${input.lng}/?token=${input.token}`
		} else if (type == "StationFeed") {
			$.log('获取站点信息');
			request.url = `${request.url}/feed/@${input.idx}/?token=${input.token}`
		}
		//$.log(`🎉 ${$.name}, Get WAQI Request`, `request: ${JSON.stringify(request)}`, "");
		return request
	};

	function GetData(type, request) {
		$.log(`⚠ ${$.name}, Get WAQI Data, type: ${type}`, "");
		return new Promise(resolve => {
			if (type == "NOW" || type == "AQI") {
				$.post(request, (error, response, data) => {
					try {
						if (error) throw new Error(error)
						else if (data) {
							const _data = JSON.parse(data)
							// Get Nearest Observation Station AQI Data
							// https://api.waqi.info/api/feed/@station.uid/now.json
							// https://api.waqi.info/api/feed/@station.uid/aqi.json
							if (type == "NOW" || type == "AQI") {
								if (_data.rxs.status == "ok") {
									if (_data.rxs.obs.some(o => o.status == 'ok')) {
										let i = _data.rxs.obs.findIndex(o => o.status == 'ok')
										let m = _data.rxs.obs.findIndex(o => o.msg)
										//$.obs = _data.rxs.obs[i].msg;
										if (i >= 0 && m >= 0) {
											$.log(`🎉 ${$.name}, GetData:${type}完成`, `i = ${i}, m = ${m}`, '')
											resolve(_data.rxs.obs[i].msg)
										} else if (i < 0 || m < 0) {
											$.log(`❗️ ${$.name}, GetData:${type}失败`, `OBS Get Error`, `i = ${i}, m = ${m}`, `空数据，浏览器访问 https://api.waqi.info/api/feed/@${idx}/aqi.json 查看获取结果`, '')
											resolve(_data.rxs.obs[i].msg)
										}
									} else $.log(`❗️ ${$.name}, GetData:${type}失败`, `OBS Status Error`, `obs.status: ${_data.rxs.obs[0].status}`, `data = ${data}`, '')
								} else $.log(`❗️ ${$.name}, GetData:${type}失败`, `RXS Status Error`, `status: ${_data.rxs.status}`, `data = ${data}`, '')
							}
						} else throw new Error(response);
					} catch (e) {
						$.logErr(`❗️${$.name}, GetData:${type}执行失败`, ` request = ${JSON.stringify(request)}`, ` error = ${error || e}`, `response = ${JSON.stringify(response)}`, `data = ${data}`, '')
					} finally {
						//$.log(`🚧 ${$.name}, GetData:${type}调试信息`, ` request = ${JSON.stringify(request)}`, `data = ${data}`, '')
						resolve()
					}
				})
			} else {
				$.get(request, (error, response, data) => {
					try {
						if (error) throw new Error(error)
						else if (data) {
							const _data = JSON.parse(data)
							// Search Nearest Observation Station
							// https://api.waqi.info/mapq/nearest/?n=1&geo=1/lat/lng
							// https://api.waqi.info/mapq2/nearest?n=1&geo=1/lat/lng
							if (type == "Nearest") {
								// 空值合并运算符
								var station = _data?.data?.stations?.[0] ?? _data?.d?.[0] ?? null;
								var idx = station?.idx ?? station?.x ?? null;
								var name = station?.name ?? station?.u ?? station?.nna ?? station?.nlo ?? null;
								var aqi = station?.aqi ?? station?.v ?? null;
								var distance = station?.distance ?? station?.d ?? null;
								// var country = station?.cca2 ?? station?.country ?? null;
								$.log(`🎉 ${$.name}, GetData:${type}完成`, `idx: ${idx}`, `观测站: ${name}`, `AQI: ${aqi}`, '')
								resolve({ station, idx })
							}
							// Get Nearest Observation Station Token
							// https://api.waqi.info/api/token/station.uid
							else if (type == "Token") {
								var token = _data.rxs?.obs[0]?.msg?.token ?? "na"
								$.log(`🎉 ${$.name}, GetData:${type}完成`, `token = ${token}`, '')
								resolve(token)
							}
							// Geolocalized Feed
							// https://aqicn.org/json-api/doc/#api-Geolocalized_Feed-GetGeolocFeed
							// https://api.waqi.info/feed/geo::lat;:lng/?token=:token
							else if (type == "CityFeed") {
								var city = (_data.status == 'ok') ? _data?.data : null;
								$.log(`🎉 ${$.name}, GetData:${type}完成`, `idx: ${city?.idx}`, `观测站: ${city?.city?.name}`, `AQI: ${city?.aqi}`, '')
								resolve(city)
							}
							// Station Feed
							// https://api.waqi.info/feed/@station.uid/?token=:token
							else if (type == "StationFeed") {
								var station = (_data.status == 'ok') ? _data?.data : null;
								$.log(`🎉 ${$.name}, GetData:${type}完成`, `idx: ${station?.idx}`, `观测站: ${station?.city?.name}`, `AQI: ${station?.aqi}`, '')
								resolve(station)
							}
						} else throw new Error(response);
					} catch (e) {
						$.logErr(`❗️${$.name}, GetData:${type}执行失败`, ` request = ${JSON.stringify(request)}`, ` error = ${error || e}`, `response = ${JSON.stringify(response)}`, `data = ${data}`, '')
					} finally {
						//$.log(`🚧 ${$.name}, GetData:${type}调试信息`, ` request = ${JSON.stringify(request)}`, `data = ${data}`, '')
						resolve()
					}
				})
			};
		});
	};
};

/**
 * Get data from "气象在线"
 * https://docs.caiyunapp.com/docs/v2.2/intro
 * https://open.caiyunapp.com/%E9%80%9A%E7%94%A8%E9%A2%84%E6%8A%A5%E6%8E%A5%E5%8F%A3/v2.2
 * @author VirgilClyne
 * @author WordlessEcho
 * @param {Object} headers - HTTP headers
 * @param {string} type - `forecast` or `realtime`
 * @param {Object} location - { latitude, longitude }
 * @return {Promise<*>} data from "气象在线"
 */
 function weatherOl(
	headers = {
		"Content-Type": "application/x-www-form-urlencoded",
		"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) " +
			"AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1",
	},
	type,
	location,
) {
	// this API could be considered as unconfigurable ColorfulClouds API
	const request = {
		"headers": headers,
		"url": "https://www.weatherol.cn/api/minute/getPrecipitation" +
			`?type=${type}` +
			`&ll=${location.longitude},${location.latitude}`,
	};

	return new Promise((resolve) => {
		$.get(request, (error, response, data) => {
			try {
				const _data = JSON.parse(data)

				if (error) {
					throw new Error(error);
				}

				if (_data?.status === "ok") {
					$.log(`🎉 ${$.name}, ${weatherOl.name}: 获取完成`, '');
					resolve(_data);
				} else {
					$.logErr(
						`❗️ ${$.name}, ${weatherOl.name}: API返回失败, `,
						`status = ${_data?.status}, `, ''
					);

					throw new Error(
						_data?.error ??
						`API returned status: ${_data?.status}` ??
						"Failed to request www.weatherol.cn"
					);
				}
			} catch (e) {
				$.logErr(
					`❗️ ${$.name}, ${weatherOl.name}执行失败！`,
					`error = ${error || e}, `,
					`response = ${JSON.stringify(response)}, `,
					`data = ${JSON.stringify(data)}`, ''
				);
			} finally {
				// $.log(
				// 	`🚧 ${$.name}, ${weatherOl.name}: 调试信息 `,
				//   `request = ${JSON.stringify(request)}, `,
				//   `data = ${data}`, ''
				// );
				resolve();
			}
		});
	});
};

/**
 * get data from ColorfulClouds
 * https://docs.caiyunapp.com/docs/intro/
 * @author WordlessEcho
 * @author shindgewongxj
 * @param {Object} headers - HTTP headers
 * @param {string} apiVersion - ColorfulClouds API version
 * @param {string} token - token for ColorfulClouds API
 * @param {Object} location - { latitude, longitude }
 * @param {Object} parameters - parameters pass to URL
 * @return {Promise<*>} data from ColorfulClouds
 */
async function colorfulClouds(
	headers = {
		"Content-Type": "application/x-www-form-urlencoded",
		"User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_1_1 like Mac OS X) " +
			"AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.1 Mobile/15E148 Safari/604.1",
	},
	apiVersion,
	token,
	location,
	path = "weather",
	parameters = { "alert": true, "dailysteps": 1, "hourlysteps": 24 },
) {
	$.log(`🚧 ${$.name}, 正在使用彩云天气 API`, "");

	const parametersArray = [];
	for (const [key, value] of Object.entries(parameters)) {
		parametersArray.push(key + '=' + value);
	}

	// Build request
	const request = {
		"headers": headers,
		"url": `https://api.caiyunapp.com/${apiVersion}/${token}/` +
			`${location.longitude},${location.latitude}/` +
			// https://docs.caiyunapp.com/docs/weather/
			`${path}` +
			`${parametersArray.length > 0 ? '?' + parametersArray.join('&') : ''}`,
	};

  // $.log(`🚧 ${$.name}, request = ${JSON.stringify(request)}`, "");

	// API Document
	// https://docs.caiyunapp.com/docs/introreturn
	return new Promise(resolve => {
		$.get(request, (error, response, data) => {
			try {
				const _data = JSON.parse(data);

				if (error) {
					throw new Error(error);
				}
				
				if (_data?.status === "ok") {
					$.log(`🎉 ${$.name}, ${colorfulClouds.name}: 获取完成`, '');
					resolve(_data);
				} else {
					$.logErr(
						`❗️ ${$.name}, ${colorfulClouds.name}: API返回失败, `,
						`status = ${_data?.status}, `, ''
					);

					throw new Error(
						_data?.error ??
						`API returned status: ${_data?.status}` ??
						"Failed to request api.caiyunapp.com"
					);
				}
			} catch (e) {
				$.logErr(
					`❗️${$.name}, ${colorfulClouds.name}: 无法获取数据 `,
					`request = ${JSON.stringify(request)}, `,
					`error = ${error || e}, `,
					`response = ${JSON.stringify(response)}, `,
					`data = ${JSON.stringify(data)}`, ''
				);
			} finally {
				// $.log(
				// 	`🚧 ${$.name}, ${colorfulClouds.name}: 调试信息 `,
				//   `request = ${JSON.stringify(request)}, `,
				//   `data = ${data}`, ''
				// );
				resolve();
			}
		});
	});
}

function appleAqiConverter(standard, airQuality) {
	const {
		IOS_SCALE, AQI_LEVELS, SIGNIFICANT_LEVEL,
		AQI_RANGES, CONCENTRATION_UNITS, CONCENTRATION_BREAKPOINTS,
	} = standard;
	let SCALE, UG_M3, PROVIDER_NAME;
	const pollutants = airQuality?.pollutants;

	switch (airQuality?.metadata?.version) {
		case 1:
			SCALE = "airQualityScale";
			UG_M3 = POLLUTANT_UNITS.SLASH.UG_M3;
			PROVIDER_NAME = "provider_name";
			break;
		case 2:
		default:
			SCALE = "scale";
			UG_M3 = POLLUTANT_UNITS.TEXT.UG_M3;
			PROVIDER_NAME = "providerName";
			break;
	};

	function toProviderName(providerName, source) {
		switch (providerName) {
			case "和风天气":
				return `${source}（${providerName}）`;
			case "QWeather":
				return `${source} (${providerName})`;
			default:
				return providerName;
		}
	}

	if (pollutants && airQuality?.[SCALE] !== IOS_SCALE) {
		$.log(
			`🚧 ${$.name}, ${appleAqiConverter.name}: `,
			`airQuality[SCALE] = ${airQuality[SCALE]}`, "",
		);

		if (airQuality[SCALE] === HJ_633.IOS_SCALE) {
			// fix unit of CO from QWeather, usually unit of CO is mg/m3
			const coName = "CO";
			const co = pollutants[coName];

			$.log(
				`🚧 ${$.name}, ${appleAqiConverter.name}: `,
				`typeof co?.amount = ${typeof co?.amount}`, "",
			);
	
			if (!isNaN(co?.amount) && co?.unit && co.unit === UG_M3) {
				const coAqi = toAqi(
					HJ_633.AQI_RANGES,
					HJ_633.CONCENTRATION_BREAKPOINTS,
					coName,
					pollutantUnitConverter(
						toTextStyleUnit(co.unit), HJ_633.CONCENTRATION_UNITS.CO, co.amount, null, coName,
					),
				);

				$.log(
					`🚧 ${$.name}, ${appleAqiConverter.name}: `,
					`coAqi = ${coAqi}`, "",
				);

				// lowest value of coAqi should be 1
				if (coAqi < 1) {
					pollutants[coName].amount =
						pollutantUnitConverter(
							HJ_633.CONCENTRATION_UNITS.CO, toTextStyleUnit(co.unit), co.amount, null, coName
						);
				}
			}
		}
	
		const pollutantsWithAqi = pollutantsToAqis(
			AQI_RANGES,
			CONCENTRATION_BREAKPOINTS,
			CONCENTRATION_UNITS,
			// TODO
			EPA_TEMPERATURE_CELSIUS,
			Object.values(pollutants),
		);

		const aqiIndex = pollutantsWithAqi.index;
		const aqiLevel = toAqiLevel(AQI_RANGES, AQI_LEVELS, pollutantsWithAqi.index);
		const aqiCategoryIndex = aqiLevel === AQI_LEVELS.OVER_RANGE ? aqiLevel - 1 : aqiLevel;
	
		return toAqiObject(
			null, null, null, null, null, null,
			toProviderName(airQuality?.metadata?.[PROVIDER_NAME], airQuality?.source), null, null, null,
			pollutants, IOS_SCALE, aqiIndex, aqiCategoryIndex,
			aqiLevel >= SIGNIFICANT_LEVEL, AQI_COMPARISON.UNKNOWN,
			pollutantsWithAqi.primaryPollutant,
		);
	} else {
		$.logErr(
			`❗️ ${$.name}: ${appleAqiConverter.name}执行失败，没有污染物数据。`,
			`pollutants = ${JSON.stringify(pollutants)}`, ""
		);
		return airQuality;
	}
};

function waqiToAqi(feedData) {
	const readTimestamp = (+ new Date());
	const nowHourTimestamp = (new Date()).setMinutes(0, 0, 0);
	const reportedTime = feedData?.time?.iso;
	const reportedTimestamp = reportedTime ? (+ new Date(reportedTime)) : nowHourTimestamp;
	const expireTimestamp = nowHourTimestamp > reportedTimestamp
		// require data after 15 minutes later if reportedTime from last hour
		? nowHourTimestamp + 1000 * 60 * 15 : reportedTimestamp + 1000 * 60 * 60;
	// language from WAQI is always English with local language based on observation stations
	const language = "en_US";
	const coordinates = feedData?.city?.geo;
	const location = {
		longitude: coordinates?.[0] ?? -1,
		latitude: coordinates?.[1] ?? -1,
	};
	const providerLogo = {
		forV1: "https://waqi.info/images/logo.png",
		forV2: "https://raw.githubusercontent.com/VirgilClyne/iRingo/main/image/waqi.info.logo.png",
	};
	const providerName = feedData?.city?.name;
	const url = feedData?.city?.url ?? "https://aqicn.org/";
	const sourceType = "station";
	const sourceName = "World Air Quality Index Project";

	const scale = WAQI_INSTANT_CAST.IOS_SCALE;
	const aqi = feedData?.aqi ?? -1;
	const categoryIndex = toAqiLevel(
		WAQI_INSTANT_CAST.AQI_RANGES, WAQI_INSTANT_CAST.AQI_LEVELS, aqi,
	);
	const isSignificant = categoryIndex >= WAQI_INSTANT_CAST.SIGNIFICANT_LEVEL;
	const previousDayComparison = AQI_COMPARISON.UNKNOWN;
	const primaryPollutant = DataBase.Pollutants[feedData?.dominentpol];

	return toAqiObject(
		readTimestamp, reportedTimestamp, expireTimestamp, language, location, providerLogo,
		// do we actually need convert AQI back to pollutant amounts?
		providerName, url, sourceType, sourceName, null, scale, aqi, categoryIndex,
		isSignificant, previousDayComparison, primaryPollutant,
	);
};

/**
 * differ rain or snow from ColorfulClouds hourly skycons
 * https://docs.caiyunapp.com/docs/tables/skycon/
 * @author WordlessEcho
 * @param {Array} skycons - skycon array from ColorfulClouds
 * @return {string} one of WEATHER_TYPES
 */
 function getCcWeatherType(skycons) {
	// enough for us
	const SKY_CONDITION_KEYWORDS = { CLEAR: "CLEAR", RAIN: "RAIN", SNOW: "SNOW" };
	const skyCondition = skycons?.map(skycon => skycon.value)?.find(condition =>
		condition.includes(SKY_CONDITION_KEYWORDS.RAIN) ||
		condition.includes(SKY_CONDITION_KEYWORDS.SNOW)
	);

	if (!skyCondition) {
		// although this function is designed for find out rain or snow
		return WEATHER_TYPES.CLEAR;
	} else {
		if (skyCondition.includes(SKY_CONDITION_KEYWORDS.SNOW)) {
			return WEATHER_TYPES.SNOW;
		} else {
			return WEATHER_TYPES.RAIN;
		}
	}
};

/**
 * Covert data from ColorfulClouds to NextHour object
 * @author WordlessEcho
 * @param {Object} dataWithMinutely - data with minutely
 * @param {Array} hourlySkycons - skycon array in hourly
 * @return {Object} object for `outputNextHour()`
 */
 function colorfulCloudsToNextHour(providerName, hourlySkycons, dataWithMinutely) {
	const SUPPORTED_APIS = [ 2 ];
	// words that used to insert into description
	const AFTER = {
		"zh_CN": "再过",
		"zh_TW": "再過",
		"ja": "その後",
		"en_US": "after that",
		// ColorfulClouds seems not prefer to display multiple times in en_GB
		"en_GB": "after that",
	};
	// splitors for description
	const SPLITORS = {
		"en_US": ["but ", "and "],
		"en_GB": ["but ", "and "],
		"zh_CN": ["，"],
		"zh_TW": ["，"],
		"ja": ["、"],
	};

	// version from API is beginning with `v`
	function getMajorVersion(apiVersion) { return parseInt(apiVersion.slice(1)) };

	const apiVersion = dataWithMinutely?.api_version;
	const majorVersion = getMajorVersion(apiVersion);
	if (!SUPPORTED_APIS.includes(majorVersion)) {
		$.logErr(
			`❗️${$.name}, ${colorfulCloudsToNextHour.name}: 不支持此版本的API, `,
			`api_version = ${apiVersion}`, ''
		);
		throw new Error(`Unsupported API version ${apiVersion}`);
	}

	// the unit of server_time is second
	const serverTime = parseInt(dataWithMinutely?.server_time);
	const serverTimestamp = !isNaN(serverTime) ? serverTime * 1000 : (+ new Date());
	// TODO
	const expireTimestamp = serverTimestamp + 1000 * 60 * 15;
	const ccLanguage = dataWithMinutely?.lang;
	// example: replace `zh_CN` to `zh-CN`
	const language = ccLanguage?.replace('_', '-') ?? "en-US";
	const location = {
		latitude: Array.isArray(dataWithMinutely?.location) ? dataWithMinutely.location[0] : -1,
		longitude: Array.isArray(dataWithMinutely?.location) && dataWithMinutely.location.length > 1
			? dataWithMinutely.location[1] : -1,
	}
	const minutely = dataWithMinutely?.result?.minutely;
	const minutelyDescription = minutely?.description;
	const precipitationTwoHr = minutely?.precipitation_2h;
	const probability = minutely?.probability;
	const forecastKeypoint = dataWithMinutely?.result?.forecast_keypoint;

	let unit = "radar";
	let precipStandard = RADAR_PRECIPITATION_RANGE;
	// https://docs.caiyunapp.com/docs/tables/unit/
	switch (dataWithMinutely?.unit) {
		case "SI":
			unit = "metersPerSecond";
			// TODO: find out the standard of this unit
			precipStandard = RADAR_PRECIPITATION_RANGE;
			break;
		case "imperial":
			unit = "inchesPerHour";
			// TODO: find out the standard of this unit
			precipStandard = RADAR_PRECIPITATION_RANGE;
			break;
		case "metric:v2":
			unit = "millimetersPerHour";
			precipStandard = MMPERHR_PRECIPITATION_RANGE;
			break;
		case "metric:v1":
		case "metric":
		default:
			unit = "radar";
			precipStandard = RADAR_PRECIPITATION_RANGE;
			break;
	}

	function toMinutes(standard, weatherType, minutelyDescription, precipitations, probability) {
		if (!Array.isArray(precipitations)) return [];

		// initialze 0 as first bound
		const bounds = [0];
		for (const lastBound of bounds) {
			const precipitationLevel = calculatePL(standard, precipitations[lastBound]);
			// find different precipitation level as next bound
			// this will ignore differences between the light and rain to avoid too many light weather
			const relativeBound = precipitations.slice(lastBound).findIndex(value => {
				if (precipitationLevel < PRECIPITATION_LEVEL.LIGHT) {
					return calculatePL(standard, value) > PRECIPITATION_LEVEL.NO;
				} else if (precipitationLevel > PRECIPITATION_LEVEL.MODERATE) {
					return calculatePL(standard, value) < PRECIPITATION_LEVEL.HEAVY;
				} else {
					return calculatePL(standard, value) < PRECIPITATION_LEVEL.LIGHT ||
						calculatePL(standard, value) > PRECIPITATION_LEVEL.MODERATE;
				}
			});

			if (relativeBound !== -1) {
				bounds.push(lastBound + relativeBound);
			}
		}

		// detect weather change by description
		// ignore clear
		if (Math.max(...precipitations) >= standard.NO.UPPER) {
			const times = minutelyDescription?.match(/\d+/g);
			times?.forEach(timeInString => {
				const time = parseInt(timeInString);

				if (!isNaN(time) && !(bounds.includes(time))) {
					// array start from 0
					bounds.push(time - 1);
				}
			});

			bounds.sort((a, b) => a - b);
		}

		// initialize minutes
		const minutes = [];
		bounds.forEach((bound, index, bounds) => {
			const sameStatusMinutes = precipitations.slice(
				bound,
				// use last index of precipitations if is last bound
				index + 1 < bounds.length ? bounds[index + 1] : precipitations.length - 1,
			);
			const precipitationLevel = calculatePL(standard, Math.max(...sameStatusMinutes));

			sameStatusMinutes.forEach((minute, index) => minutes.push({
				weatherStatus: precipLevelToStatus(weatherType, precipitationLevel),
				precipitation: minute,
				// set chance to zero if clear
				chance: precipitationLevel > PRECIPITATION_LEVEL.NO
					// calculate order, 1 as first index
					// index here is relative to bound, plus bound for real index in precipitations
					// we have only 4 chances per half hour from API
					? parseInt(probability[parseInt((1 + bound + index) / 30)] * 100) : 0
			}));
		});

		return minutes;
	};

	// extract minute times that helpful for Apple to use cache data
	function toDescriptions(isClear, forecastKeypoint, minutelyDescription, language) {
		let longDescription = minutelyDescription ?? forecastKeypoint;
		// match all numbers in descriptions to array
		const parameters = {};

		function getSentenceSplitors(language) {
			switch (language) {
				case "en_GB":
					return SPLITORS.en_GB;
				case "zh_CN":
					return SPLITORS.zh_CN;
				case "zh_TW":
					return SPLITORS.zh_TW;
				case "ja":
					return SPLITORS.ja;
				case "en_US":
				default:
					return SPLITORS.en_US;
			}
		};

		function insertAfterToDescription(language, description) {
			const FIRST_AT = "{firstAt}";
			// split into two part at `{firstAt}`
			const splitedDescriptions = description?.split(FIRST_AT);

			switch (language) {
				case "en_GB":
					// take second part to skip firstAt
					// append `after that` to description
					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							// remove stopping & later
							// (.*?) will match `*At`
							.replaceAll("} min later", `{$1} min later ${AFTER.en_GB}`);
					break;
				case "zh_CN":
					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("直到{", '{');

					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("{", `${AFTER.zh_CN}{`);
					break;
				case "zh_TW":
					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("直到{", '{');

					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("{", `${AFTER.zh_TW}{`);
					break;
				case "ja":
					// Japanese support from ColorfulClouds is broken for sometime
					// https://lolic.at/notice/AJNH316TTSy1fRlOka

					// TODO: I am not familiar for Japanese, contributions welcome
					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("{", `${AFTER.ja}{`);
					break;
				case "en_US":
				default:
					splitedDescriptions[splitedDescriptions.length - 1] =
						splitedDescriptions[splitedDescriptions.length - 1]
							.replaceAll("} min later", `{$1} min later ${AFTER.en_US}`);
					break;
			}

			return splitedDescriptions.join(FIRST_AT);
		};

		// https://stackoverflow.com/a/20426113
		// transfer numbers into ordinal numerals
		function stringifyNumber(n) {
			const special = [
				'zeroth', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
				'ninth', 'tenth', 'eleventh', 'twelfth', 'thirteenth', 'fourteenth', 'fifteenth',
				'sixteenth', 'seventeenth', 'eighteenth', 'nineteenth',
			];
			const deca = ['twent', 'thirt', 'fort', 'fift', 'sixt', 'sevent', 'eight', 'ninet'];

			if (n < 20) return special[n];
			if (n % 10 === 0) return deca[Math.floor(n / 10) - 2] + 'ieth';
			return deca[Math.floor(n / 10) - 2] + 'y-' + special[n % 10];
		};

		const descriptions = [];
		descriptions.push({
			long: longDescription,
			short: forecastKeypoint ?? minutelyDescription,
			parameters,
		});

		if (!isClear) {
			// split sentence by time
			const allTimes = longDescription?.match(/\d+/g);
			allTimes?.forEach(timeInString => {
				const startIndex = longDescription.indexOf(timeInString) + timeInString.length;
				const splitors = getSentenceSplitors(language);

				let splitIndex = 0;
				for (const splitor of splitors) {
					const index = longDescription.indexOf(splitor, startIndex) + splitor.length;

					if (index !== -1 && (splitIndex === 0 || index < splitIndex)) {
						splitIndex = index;
					}
				}

				descriptions.push({
					long: longDescription.slice(splitIndex),
					short: forecastKeypoint ?? minutelyDescription,
					parameters,
				});
			});

			// format description.long and add parameters
			for (const description of descriptions) {
				const times = description.long?.match(/\d+/g);
				times?.forEach((timeInString, index) => {
					const time = parseInt(timeInString);
	
					if (!isNaN(time)) {
						const key = `${stringifyNumber(index + 1)}At`;
	
						description.long = description.long.replace(timeInString, '{' + key + '}');
						// times after {firstAt} is lasting time in Apple Weather
						// and will be displayed as `lasting for {secondAt} - {firstAt} min`
						description.long = insertAfterToDescription(language, description.long);
						description.parameters[key] = time;
					}
				});
			}
		}

		return descriptions;
	};

	return toNextHourObject(
		(+ new Date()),
		expireTimestamp,
		language,
		location,
		providerName,
		unit,
		// TODO
		"modeled",
		precipStandard,
		toMinutes(
			precipStandard,
			getCcWeatherType(hourlySkycons),
			minutelyDescription,
			precipitationTwoHr,
			probability,
		),
		toDescriptions(
			// display description only rain in one hour
			!(Math.max(...precipitationTwoHr.slice(0, 59) ?? [0]) >= precipStandard.NO.UPPER),
			forecastKeypoint,
			minutelyDescription,
			ccLanguage,
		),
	);
};

/**
 * Produce a object for `outputAQI()`
 * @author WordlessEcho
 * @param {Number} readTimestamp - UNIX timestamp when user read
 * @param {Number} reportedTimestamp - UNIX timestamp when observation station reported data
 * @param {Number} expireTimestamp - UNIX timestamp when data expire
 * @param {string} language - ISO 3166-1 language tag
 * @param {Object} location - `{ latitude, longitude }`
 * @param {Object} providerLogo - `{ forV2, forV1 }` logo of provider
 * @param {string} providerName - provider name
 * @param {String} url - URL to the website of AQI details
 * @param {Object} pollutants - array of `{ name, amount, unit }`
 * @param {String} sourceType - `station` or `modeled`
 * @param {String} sourceName - will be displayed in the bottom of details
 * @param {String} scale - name of AQI standard
 * @param {Number} aqi - AQI index
 * @param {Number} categoryIndex - AQI level starts from 1
 * @param {boolean} isSignificant - importance of AQI info
 * @param {Number} previousDayComparison - yesterday AQI index for comparison
 * @param {String} primaryPollutant - name of the primary pollutant
 * @return {Object} object for `outputAQI()`
 */
function toAqiObject(
	readTimestamp,
	reportedTimestamp,
	expireTimestamp,
	language,
	location,
	providerLogo,
	providerName,
	url,
	sourceType,
	sourceName,
	pollutants,
	scale,
	aqi,
	categoryIndex,
	isSignificant,
	previousDayComparison,
	primaryPollutant,
) {
	const aqiObject = {
		readTimestamp,
		reportedTimestamp,
		expireTimestamp,
		language,
		location,
		providerLogo,
		providerName,
		url,
		sourceType,
		sourceName,
		pollutants,
		scale,
		aqi,
		categoryIndex,
		isSignificant,
		previousDayComparison,
		primaryPollutant,
	};

	// $.log(
	// 	`⚠️ ${$.name}, ${toAqiObject.name}: `,
	// 	`aqiObject = ${JSON.stringify(aqiObject)}`, ''
	// );

	return aqiObject;
};

/**
 * Produce a object for `outputNextHour()`
 * @author WordlessEcho
 * @param {Number} readTimestamp - UNIX timestamp when user read
 * @param {Number} expireTimestamp - UNIX timestamp when data expire
 * @param {string} language - ISO 3166-1 language tag
 * @param {Object} location - `{ latitude, longitude }`
 * @param {string} providerName - provider name
 * @param {string} unit - example: "mmPerHour"
 * @param {string} sourceName - `station` or `modeled`
 * @param {Object} precipStandard - `*_PRECIPITATION_RANGE`
 * @param {Array} minutes - array of `{ weatherStatus: one of WEATHER_STATUS, precipitation,
 * chance: percentage (0 to 100) }`
 * @param {Array} descriptions - array of `{ long: "Rain starting in {firstAt} min",
 * short: "Rain for the next hour", parameters: (can be empty) { "firstAt": minutesNumber } }`
 * @return {Object} object for `outputNextHour()`
 */
function toNextHourObject(
	readTimestamp,
	expireTimestamp,
	language,
	location,
	providerName,
	unit,
	sourceType,
	precipStandard,
	minutes,
	descriptions,
) {
	// it looks like Apple doesn't care unit

	// description can be more than one and relative to summary
	// but there are too much works to collect different language of templates of Apple Weather
	// I wish Apple could provide description from app but not API
	const nextHourObject =  {
		readTimestamp,
		expireTimestamp,
		language,
		location,
		providerName,
		unit,
		sourceType,
		precipStandard,
		minutes,
		descriptions,
	};

	// $.log(
	// 	`⚠️ ${$.name}, ${toNextHourObject.name}: `,
	// 	`nextHourObject = ${JSON.stringify(nextHourObject)}`, ''
	// );

	return nextHourObject;
};

/**
 * Output Air Quality Data
 * @author VirgilClyne
 * @param {String} apiVersion - Apple Weather API Version
 * @param {Object} now - now weather data from Third-Party
 * @param {Object} obs - observation station data from Third-Party
 * @param {Object} weather - weather data from Apple
 * @param {Object} Settings - Settings config in Box.js
 * @return {Promise<*>}
 */
async function outputAqi(apiVersion, aqiObject) {
	$.log(`⚠️ ${$.name}, ${outputAqi.name}检测`, `AQI data ${apiVersion}`, '');
	$.log(`🚧 ${$.name}, ${outputAqi.name}: `, `aqiObject = ${JSON.stringify(aqiObject)}`, '');

	// 创建对象
	const airQuality = { "name": "AirQuality" };

	airQuality.metadata = toMetadata(
		apiVersion, aqiObject.expireTimestamp, aqiObject.language, aqiObject.location,
		aqiObject.providerLogo, aqiObject.providerName, aqiObject.readTimestamp,
		// TODO
		aqiObject.reportedTimestamp, null, aqiObject.sourceType === "station" ? 0 : 1,
	);

	airQuality.isSignificant = aqiObject.isSignificant;
	airQuality.learnMoreURL = aqiObject.url;

	// 注入数据
	switch (apiVersion) {
		case "v1":
			airQuality.airQualityCategoryIndex = aqiObject.categoryIndex;
			airQuality.airQualityIndex = aqiObject.aqi;
			airQuality.airQualityScale = aqiObject.scale;
			break;
		case "v2":
			airQuality.categoryIndex = aqiObject.categoryIndex;
			airQuality.index = aqiObject.aqi;
			airQuality.previousDayComparison = aqiObject.previousDayComparison;
			airQuality.scale = aqiObject.scale;
			airQuality.sourceType = aqiObject.sourceType; //station:监测站 modeled:模型
			break;
	};

	airQuality.pollutants = aqiObject.pollutants ?? {};
	airQuality.primaryPollutant = aqiObject.primaryPollutant;
	airQuality.source = aqiObject.sourceName;

	$.log(`🎉 ${$.name}, ${outputAqi.name}完成`, '');
	Object.keys(airQuality).forEach(key =>
		(airQuality[key] === null || airQuality[key] === undefined || airQuality[key] === NaN)
			&& delete airQuality[key]
	);
	return airQuality;
};

/**
 * output forecast NextHour Data
 * @author WordlessEcho
 * @author VirgilClyne
 * @param {String} apiVersion - Apple Weather API Version
 * @param {Object} nextHourObject - generated by `toNextHourObject()`
 * @param {Object} debugOptions - nullable, debug settings configs in Box.js
 * @return {Promise<*>} a `Promise` that returned edited Apple data
 */
async function outputNextHour(apiVersion, nextHourObject, debugOptions) {
	$.log(`⚠️ ${$.name}, ${outputNextHour.name}检测`, `API: ${apiVersion}`, '');
	// 3 demical places in `precipIntensityPerceived`
	const PERCEIVED_DECIMAL_PLACES = 1000;
	// 2 demical places in `precipIntensity`
	const _INTENSITY_DECIMAL_PLACES = 100;
	// the graph of Apple weather is divided into three parts
	const PERCEIVED_DIVIDERS = { INVALID: -1, BEGINNING: 0, BOTTOM: 1, MIDDLE: 2, TOP: 3, };

	// 创建对象
	const nextHour = { "name": "NextHourForecast" };
	const readTimestamp = nextHourObject.readTimestamp ?? (+ new Date());

	// 注入数据
	nextHour.metadata = toMetadata(
		apiVersion, nextHourObject.expireTimestamp, nextHourObject.language, nextHourObject.location,
		null, nextHourObject.providerName, readTimestamp, null,
		nextHourObject.unit, nextHourObject.sourceType === "station" ? 0 : 1,
	);

	const minutesData = nextHourObject.minutes ?? [];

	if (minutesData.length > 0) {
		// use next minute and set second to zero as start time in next hour forecast
		const startTimestamp = (+ (new Date(readTimestamp + 1000 * 60)).setSeconds(0, 0));
		nextHour.startTime = convertTime(apiVersion, new Date(startTimestamp), 0, 0);
		nextHour.minutes = getMinutes(apiVersion, minutesData, startTimestamp);
		nextHour.condition = getConditions(
			apiVersion,
			minutesData,
			startTimestamp,
			nextHourObject.descriptions,
		);
		nextHour.summary = getSummaries(apiVersion, minutesData, startTimestamp);

		$.log(`🎉 ${$.name}, 下一小时降水强度替换完成`, "");
	} else {
		switch (apiVersion) {
			case "v1":
				nextHour.metadata.temporarily_unavailable = true;
				break;
			case "v2":
			default:
				nextHour.metadata.temporarilyUnavailable = true;
				break;
		}
	}

	return nextHour;

	/***************** Fuctions *****************/
	// mapping the standard preciptation level to 3 level standard of Apple
	function toApplePrecipitation(standard, precipitation) {
		const {
			NO,
			LIGHT,
			MODERATE,
			HEAVY,
		} = standard;

		switch (calculatePL(standard, precipitation)) {
			case PRECIPITATION_LEVEL.INVALID:
				return PERCEIVED_DIVIDERS.INVALID;
			case PRECIPITATION_LEVEL.NO:
				return PERCEIVED_DIVIDERS.BEGINNING;
			case PRECIPITATION_LEVEL.LIGHT:
				return (
					// multiple 1000 (PERCEIVED_DECIMAL_PLACES) for precision of calculation
					// base of previous levels and plus the percentage of value at its level
					PERCEIVED_DIVIDERS.BEGINNING +
					// from the lower of range to the value
					(((precipitation - NO.UPPER) * PERCEIVED_DECIMAL_PLACES) /
						// sum of the range
						((LIGHT.UPPER - LIGHT.LOWER) * PERCEIVED_DECIMAL_PLACES))
					// divided them to get percentage
					// then calculate Apple standard value by percentage
					// because Apple divided graph into 3 parts, value limitation is also 3
					// we omit the "multiple one"
				);
			case PRECIPITATION_LEVEL.MODERATE:
				return (
					PERCEIVED_DIVIDERS.BOTTOM +
					(((precipitation - LIGHT.UPPER) * PERCEIVED_DECIMAL_PLACES) /
						((MODERATE.UPPER - MODERATE.LOWER) * PERCEIVED_DECIMAL_PLACES))
				);
			case PRECIPITATION_LEVEL.HEAVY:
				return (
					PERCEIVED_DIVIDERS.MIDDLE +
					(((precipitation - MODERATE.UPPER) * PERCEIVED_DECIMAL_PLACES) /
						((HEAVY.UPPER - HEAVY.LOWER) * PERCEIVED_DECIMAL_PLACES))
				);
			case PRECIPITATION_LEVEL.STORM:
			default:
				return PERCEIVED_DIVIDERS.TOP;
		}
	};

	function getMinutes(apiVersion, minutesData, startTimestamp) {
		// $.log(`🚧 ${$.name}, 开始设置Minutes`, '');
		const minutes = minutesData.map(({ precipitation, chance }, index) => {
			const minute = {
				"precipIntensity": precipitation,
				"precipChance": chance,
			};

			if (apiVersion == "v1") {
				minute.startAt = convertTime(apiVersion, new Date(startTimestamp), index);
				minute.perceivedIntensity = toApplePrecipitation(
					nextHourObject.precipStandard, precipitation,
				);
			} else {
				minute.startTime = convertTime(apiVersion, new Date(startTimestamp), index);
				minute.precipIntensityPerceived = toApplePrecipitation(
					nextHourObject.precipStandard, precipitation,
				);
			}

			return minute;
		});

		// $.log(`🚧 ${$.name}, minutes = ${JSON.stringify(minutes)}`, '');
		return minutes;
	};

	function getConditions(apiVersion, minutesData, startTimestamp, descriptions) {
		$.log(`🚧 ${$.name}, 开始设置conditions`, "");
		// TODO: when to add possible
		const ADD_POSSIBLE_UPPER = 0;
		const POSSIBILITY = { POSSIBLE: "possible" };
		const TIME_STATUS = {
			CONSTANT: "constant",
			START: "start",
			STOP: "stop"
		};

		function toToken(possibleClear, weatherStatus, timeStatus) {
			const tokenLeft =
				`${possibleClear ? POSSIBILITY.POSSIBLE + '-' : ''}${weatherStatus.join('-to-')}`;

			if (timeStatus.length > 0 && weatherStatus[0] !== WEATHER_STATUS.CLEAR) {
				return `${tokenLeft}.${timeStatus.join('-')}`;
			} else {
				// weatherStatus is clear, no timeStatus needed
				return tokenLeft;
			}
		};

		function needPossible(precipChance) { return precipChance < ADD_POSSIBLE_UPPER };

		// initialize data
		const slicedMinutes = minutesData.slice(0, 59);
		// empty object for loop
		const conditions = [{}];

		let lastBoundIndex = 0;
		let weatherStatus = [slicedMinutes[lastBoundIndex].weatherStatus];

		for (const _condition of conditions) {
			// initialize data
			const index = conditions.length - 1;
			const lastWeather = weatherStatus[weatherStatus.length - 1];
			const minutesForConditions = slicedMinutes.slice(lastBoundIndex);
			const boundIndex = minutesForConditions
				.findIndex(minute => minute.weatherStatus !== lastWeather);

			let timeStatus = [TIME_STATUS.START];
			// set descriptions as more as possible
			const descriptionsIndex = index < descriptions.length ? index : descriptions.length - 1;
			const condition = {
				longTemplate: descriptions[descriptionsIndex].long,
				shortTemplate: descriptions[descriptionsIndex].short,
				parameters: {},
			};
			if (apiVersion !== "v1") {
				condition.startTime = convertTime(apiVersion, new Date(startTimestamp), lastBoundIndex);
			}
			// time provided by nextHourObject is relative of startTimestamp
			for (const [key, value] of Object.entries(descriptions[descriptionsIndex].parameters)) {
				// $.log(
				// 	`🚧 ${$.name}, `,
				// 	`descriptions[${descriptionsIndex}].parameters.${key} = ${value}, `,
				// 	`startTimestamp = ${startTimestamp}, `,
				// 	`new Date(startTimestamp) = ${new Date(startTimestamp)}`, ""
				// );

				condition.parameters[key] = convertTime(apiVersion, new Date(startTimestamp), value);
			};

			if (boundIndex === -1) {
				// cannot find the next bound
				const chance = Math.max(...minutesForConditions.map(minute => minute.chance));
				// $.log(`🚧 ${$.name}, max chance = ${chance}`, '');
				const possibleClear = needPossible(chance);
				timeStatus = [TIME_STATUS.CONSTANT];

				condition.token = toToken(possibleClear, weatherStatus, timeStatus);

				conditions.push(condition);

				// avoid endless loop
				lastBoundIndex = slicedMinutes.length - 1;
				break;
			} else {
				const chance = Math.max(
					...minutesForConditions.slice(0, boundIndex).map(minute => minute.chance)
				);
				// $.log(`🚧 ${$.name}, max chance = ${chance}`, '');
				const possibleClear = needPossible(chance);
				const currentWeather = minutesForConditions[boundIndex].weatherStatus;
				const endTime =
					convertTime(apiVersion, new Date(startTimestamp), lastBoundIndex + boundIndex);

				switch (apiVersion) {
					case "v1":
						condition.validUntil = endTime;
						break;
					case "v2":
					default:
						condition.endTime = endTime;
						break;
				}

				switch (currentWeather) {
					case WEATHER_STATUS.CLEAR:
						timeStatus.push(TIME_STATUS.STOP);
						break;
					// TODO: drizzle & flurries
					case WEATHER_STATUS.DRIZZLE:
					case WEATHER_STATUS.FLURRIES:
					case WEATHER_STATUS.SLEET:
					case WEATHER_STATUS.RAIN:
					case WEATHER_STATUS.SNOW:
					case WEATHER_STATUS.HEAVY_RAIN:
					case WEATHER_STATUS.HEAVY_SNOW:
					default:
						if (lastWeather !== WEATHER_STATUS.CLEAR) {
							timeStatus = [TIME_STATUS.CONSTANT];
						}
						break;
				}

				switch (lastWeather) {
					case WEATHER_STATUS.CLEAR:
						condition.token = toToken(possibleClear, [currentWeather], timeStatus);
						break;
					case WEATHER_STATUS.HEAVY_RAIN:
					case WEATHER_STATUS.HEAVY_SNOW:
						weatherStatus.push(currentWeather);
						// no break as intend
					// TODO: drizzle & flurries
					case WEATHER_STATUS.DRIZZLE:
					case WEATHER_STATUS.FLURRIES:
					case WEATHER_STATUS.SLEET:
					case WEATHER_STATUS.RAIN:
					case WEATHER_STATUS.SNOW:
					default:
						condition.token = toToken(possibleClear, weatherStatus, timeStatus);
						break;
				}

				conditions.push(condition);

				lastBoundIndex += boundIndex;
				weatherStatus = [minutesForConditions[boundIndex].weatherStatus];
			}
		}

		// shift first empty object
		conditions.shift();
		$.log(`🚧 ${$.name}, conditions = ${JSON.stringify(conditions)}`, '');
		return conditions;
	};

	function getSummaries(apiVersion, minutesData, startTimestamp) {
		$.log(`🚧 ${$.name}, 开始设置summary`, "");
		const slicedMinutes = minutesData.slice(0, 59);

		// initialize data
		// empty object for loop
		let summaries = [{}];
		let lastBoundIndex = 0;

		for (const _summary of summaries) {
			// initialize data
			const isClear = slicedMinutes[lastBoundIndex].weatherStatus === WEATHER_STATUS.CLEAR;
			const minutesForSummary = slicedMinutes.slice(lastBoundIndex);
			const boundIndex = minutesForSummary.findIndex(minute =>
				isClear ? minute.weatherStatus !== WEATHER_STATUS.CLEAR
					: minute.weatherStatus === WEATHER_STATUS.CLEAR
			);

			const summary = {
				condition: weatherStatusToType(slicedMinutes[lastBoundIndex].weatherStatus),
			};
			if (apiVersion !== "v1") {
				summary.startTime = convertTime(apiVersion, new Date(startTimestamp), lastBoundIndex);
			}

			if (!isClear) {
				const minutesForNotClear = minutesForSummary.slice(
					0,
					boundIndex === -1 ? slicedMinutes.length - 1 : boundIndex,
				);
				const chance = Math.max(...minutesForNotClear.map(minute => minute.chance));
				const precipitations = minutesForNotClear.map(minute => minute.precipitation);

				switch (apiVersion) {
					case "v1":
						summary.probability = chance;
						summary.maxIntensity = Math.max(...precipitations);
						summary.minIntensity = Math.min(...precipitations);
						break;
					case "v2":
					default:
						summary.precipChance = chance;
						summary.precipIntensity = Math.max(...precipitations);
						break;
				}
			}

			if (boundIndex === -1) {
				summaries.push(summary);

				// avoid endless loop
				lastBoundIndex = slicedMinutes.length - 1;
				break;
			} else {
				const endTime =
					convertTime(apiVersion, new Date(startTimestamp), lastBoundIndex + boundIndex);
				switch (apiVersion) {
					case "v1":
						summary.validUntil = endTime;
					case "v2":
						summary.endTime = endTime;
				}

				summaries.push(summary);

				lastBoundIndex += boundIndex;
			}
		};

		summaries.shift();
		$.log(`🚧 ${$.name}, summaries = ${JSON.stringify(summaries)}`, "");
		return summaries;
	};
};

/***************** Fuctions *****************/
function cacheAqi(caches, timestamp, location, stationName, aqi) {
	$.log(
		`🚧 ${$.name}, ${cacheAqi.name}：new Date(timestamp) = ${new Date(timestamp)}, aqi = ${aqi}`, "",
	);

	const aqis = caches?.aqi;
	const aqiCache = Array.isArray(aqis?.[timestamp]) ? aqis[timestamp] : [];

	aqiCache.push({ location, stationName, aqi });

	// delete the cache before two day ago
	const cacheLimit = (+ new Date()) - 1000 * 60 * 60 * 48;
	Object.keys(aqis).forEach(key => key < cacheLimit && delete aqis[key]);

	$.setjson(
		{ ...caches, "aqi": { ...aqis, ...{ timestamp: aqiCache } } },
		"@iRingo.Weather.Caches",
	);
};

/**
 * Convert Time
 * @author VirgilClyne
 * @param {String} apiVersion - Apple Weather API Version
 * @param {Time} time - Time
 * @param {Number} addMinutes - add Minutes Number
 * @param {Number} addSeconds - add Seconds Number
 * @returns {String}
 */
function convertTime(apiVersion, time, addMinutes = 0, addSeconds = "") {
	time.setMinutes(time.getMinutes() + addMinutes, (addSeconds) ? time.getSeconds() + addSeconds : 0, 0);
	let timeString = (apiVersion == "v1") ? time.getTime() / 1000 : time.toISOString().split(".")[0] + "Z"
	return timeString;
};

/**
 * Calculate Air Quality Level
 * @author VirgilClyne
 * @param {Number} AQI - Air Quality index
 * @returns {Number}
 */
function toAqiLevel(aqiRange, aqiLevel, aqi) {
	for (const [name, range] of Object.entries(aqiRange)) {
		if (aqi <= range.UPPER) {
			return aqiLevel[name];
		}
	}
};

function compareAqi(aqiRange, aqiLevel, aqiA, aqiB) {
	if (typeof aqiA !== "number" || typeof aqiB !== "number") {
		return AQI_COMPARISON.UNKNOWN;
	}

	const currentAqiLevel =
		toAqiLevel(aqiRange, aqiLevel, aqiA);
	const yesterdayAqiLevel =
		toAqiLevel(aqiRange, aqiLevel, aqiB);

	if (currentAqiLevel > yesterdayAqiLevel) {
		return AQI_COMPARISON.WORSE;
	} else if (currentAqiLevel < yesterdayAqiLevel) {
		return AQI_COMPARISON.BETTER;
	} else {
		return AQI_COMPARISON.SAME;
	}
}

function getMolecularWeight(chemicalFormula) {
	if (typeof chemicalFormula === "string" && chemicalFormula.match(/[\W_]+/)) {
		throw Error(`wrong format of chemical formula: ${chemicalFormula}`);
	}

	function getAtomicWeight(atom) {
		// https://www.cmu.edu/gelfand/lgc-educational-media/polymers/what-is-polymer/molecular-weight-calculation.html
		// enough for us
		const atomicWeights = {
			"H": 1, "C": 12, "N": 14, "O": 16,
			"Na": 23, "Cl": 35, "S": 32,
		};

		const atomicWeight = atomicWeights[atom];

		if (isNaN(atomicWeight)) {
			throw Error(
				`unsupported chemical formula or wrong format of chemical formula: ${chemicalFormula}`
			);
		}

		return atomicWeight;
	};

	const stringArray = chemicalFormula.split('');

	let atom = '';
	let multiplier = '';
	let molecularWeight = 0;

	function toWeight(atom, multiplier) {
		return getAtomicWeight(atom) * (multiplier === '' ? 1 : parseInt(multiplier));
	};

	stringArray.forEach((char, index, array) => {
		if (!isNaN(parseInt(char))) {
			multiplier += char;
		} else if (char === char.toLowerCase()) {
			atom += char;
		} else {
			if (atom !== '') {
				molecularWeight += toWeight(atom, multiplier);
			}

			atom = char;
			multiplier = '';
		}

		if (index + 1 === array.length) {
			molecularWeight += toWeight(atom, multiplier);
		}
	});

	return molecularWeight;
};

function toTextStyleUnit(unit) {
	for (const [key, value] of Object.entries(POLLUTANT_UNITS.SLASH)) {
		if (unit === value) {
			return POLLUTANT_UNITS.TEXT[key];
		}
	}

	return unit;
};

function toChemicalFormula(name) {
	const chemicalFormulaList = { "OZONE": "O3" };
	const chemicalFormula = chemicalFormulaList[name];

	if (chemicalFormula) {
		return chemicalFormula;
	} else {
		return name;
	}
}

// https://aqicn.org/faq/2015-09-06/ozone-aqi-using-concentrations-in-milligrams-or-ppb
// https://cfpub.epa.gov/ncer_abstracts/index.cfm/fuseaction/display.files/fileid/14285
function pollutantUnitConverter(unit, unitToConvert, amount, temperatureCelsius, chemicalFormula) {
	const INVERSE_GAS_CONSTANT = 12.187;
	const ZERO_CELSIUS_IN_KELVIN = 273.15;
	const { PPM, PPB, MG_M3, UG_M3 } = POLLUTANT_UNITS.TEXT;

	function ppmToMgM3(amount, temperatureCelsius, chemicalFormula) {
		return amount * INVERSE_GAS_CONSTANT * getMolecularWeight(chemicalFormula)
			/ (temperatureCelsius + ZERO_CELSIUS_IN_KELVIN);
	};

	function ppbToUgM3(amount, temperatureCelsius, chemicalFormula) {
		return ppmToMgM3(amount, temperatureCelsius, chemicalFormula);
	};

	function mgM3ToPpm(amount, temperatureCelsius, chemicalFormula) {
		return amount * (temperatureCelsius + ZERO_CELSIUS_IN_KELVIN)
			/ (INVERSE_GAS_CONSTANT * getMolecularWeight(chemicalFormula));
	};

	function ugM3ToPpb(amount, temperatureCelsius, chemicalFormula) {
		return mgM3ToPpm(amount, temperatureCelsius, chemicalFormula);
	};

	switch (unit) {
		case PPM:
			switch (unitToConvert) {
				case PPM:
					return amount;
				case PPB:
					return amount * 1000;
				case MG_M3:
					return ppmToMgM3(amount, temperatureCelsius, chemicalFormula);
				case UG_M3:
					const inPpb = pollutantUnitConverter(unit, PPB, amount, null, null);
					return ppbToUgM3(inPpb, temperatureCelsius, chemicalFormula);
				default:
					break;
			};
			break;
		case PPB:
			switch (unitToConvert) {
				case PPB:
					return amount;
				case PPM:
					return amount * 0.001;
				case MG_M3:
					const inPpm = pollutantUnitConverter(unit, PPM, amount, null, null);
					return ppmToMgM3(inPpm, temperatureCelsius, chemicalFormula);
				case UG_M3:
					return ppbToUgM3(amount, temperatureCelsius, chemicalFormula);
				default:
					break;
			};
			break;
		case MG_M3:
			switch (unitToConvert) {
				case MG_M3:
					return amount;
				case UG_M3:
					return amount * 1000;
				case PPM:
					return mgM3ToPpm(amount, temperatureCelsius, chemicalFormula);
				case PPB:
					const inUgM3 = pollutantUnitConverter(
						unit, UG_M3, amount, null, null
					);
					return ugM3ToPpb(inUgM3, temperatureCelsius, chemicalFormula);
				default:
					break;
			};
			break;
		case UG_M3:
			switch (unitToConvert) {
				case UG_M3:
					return amount;
				case MG_M3:
					return amount * 0.001;
				case PPM:
					const inMgM3 = pollutantUnitConverter(
						unit, MG_M3, amount, null, null
					);
					return mgM3ToPpm(inMgM3, temperatureCelsius, chemicalFormula);
				case PPB:
					return ugM3ToPpb(amount, temperatureCelsius, chemicalFormula);
				default:
					break;
			};
			break;
		default:
			break;
	}

	throw Error(`unsupported unit: unit = ${unit}, unitToConvert = ${unitToConvert}`);
};

function toAqi(aqiRanges, concentrationBreakpoints, pollutantName, pollutantValue) {
	const breakpoints = Object.entries(concentrationBreakpoints[pollutantName]);

	for (const [aqiLevel, concentrationRange] of breakpoints) {
		if (pollutantValue <= concentrationRange.UPPER) {
			const aqiRange = aqiRanges[aqiLevel];
			return Math.round(
				(aqiRange.UPPER - aqiRange.LOWER) * (pollutantValue - concentrationRange.LOWER)
					/ (concentrationRange.UPPER - concentrationRange.LOWER) + aqiRange.LOWER
			);
		}
	};

	// over range!
	const findMax = (previous, current) => current.UPPER > previous.UPPER ? current : previous;
	const aqiRange = Object.values(aqiRanges).reduce(findMax);
	const concentrationRange = Object.values(concentrationBreakpoints[pollutantName])
		.reduce(findMax);
	// should we use 500 instead of calculation?
	return Math.round(pollutantValue - concentrationRange.UPPER + aqiRange.UPPER);
};

function pollutantsToAqis(
	aqiRanges, concentrationBreakpoints, concentrationUnits, temperatureCelsius, pollutants,
) {
	const aqis = { index: -1, pollutants: [] };

	if (pollutants) {
		pollutants.forEach(({ name, amount, unit }) => {
			if (Object.keys(concentrationBreakpoints).includes(name)) {
				const unitToConvert = concentrationUnits[name];
				let amountValue = amount;
				if (unit !== unitToConvert) {
					amountValue = pollutantUnitConverter(
						toTextStyleUnit(unit),
						unitToConvert,
						amount,
						temperatureCelsius,
						toChemicalFormula(name),
					);
				}

				const aqi = toAqi(aqiRanges, concentrationBreakpoints, name, amountValue);

				aqis.pollutants.push({ name, amount, unit, aqi });
			}
		});

		const primary = aqis.pollutants.reduce((previous, current) =>
			current.aqi > previous.aqi ? current : previous
		);

		aqis.index = primary.aqi;
		aqis.primaryPollutant = primary.name;
	}

	return aqis;
};

/**
 * Calculate Precipitation Level
 * https://docs.caiyunapp.com/docs/tables/precip
 * @author VirgilClyne
 * @author WordlessEcho
 * @param {object} standard - `*_PRECIPITATION_RANGE`
 * @param {Number} pptn - precipitation
 * @returns {Number} one of `PRECIPITATION_LEVEL`
 */
function calculatePL(standard, pptn) {
	const {
		NO,
		LIGHT,
		MODERATE,
		HEAVY,
	} = standard;

	if (typeof pptn !== "number") return PRECIPITATION_LEVEL.INVALID;
	else if (pptn < NO.UPPER) return PRECIPITATION_LEVEL.NO;
	else if (pptn < LIGHT.UPPER) return PRECIPITATION_LEVEL.LIGHT;
	else if (pptn < MODERATE.UPPER) return PRECIPITATION_LEVEL.MODERATE;
	else if (pptn < HEAVY.UPPER) return PRECIPITATION_LEVEL.HEAVY;
	else return PRECIPITATION_LEVEL.STORM;
};

/**
 * Convert PRECIPITATION_LEVEL to WEATHER_TYPES
 * @author WordlessEcho
 * @param {string} weatherType - one of `WEATHER_TYPES`
 * @param {Number} precipitationLevel - one of `PRECIPITATION_LEVEL`
 * @returns {string} one of `WEATHER_STATUS`
 */
function precipLevelToStatus(weatherType, precipitationLevel) {
	const {
		INVALID,
		NO,
		LIGHT,
		MODERATE,
		HEAVY,
		STORM,
	} = PRECIPITATION_LEVEL;

	if (
		weatherType === WEATHER_TYPES.CLEAR ||
		precipitationLevel === INVALID ||
		precipitationLevel === NO
	) {
		return WEATHER_STATUS.CLEAR;
	}

	switch (precipitationLevel) {
		case LIGHT:
			return weatherType === WEATHER_TYPES.RAIN ? WEATHER_STATUS.DRIZZLE : WEATHER_STATUS.FLURRIES;
		case MODERATE:
			return weatherType === WEATHER_TYPES.RAIN ? WEATHER_STATUS.RAIN : WEATHER_STATUS.SNOW;
		case HEAVY:
		case STORM:
			return weatherType === WEATHER_TYPES.RAIN
				? WEATHER_STATUS.HEAVY_RAIN : WEATHER_STATUS.HEAVY_SNOW;
		default:
			$.logErr(
				`❗️${$.name}, unexpeted precipitation level, `,
				`precipitationLevel = ${precipitationLevel}`
			);
			return WEATHER_STATUS.CLEAR;
	}
};

/**
 * Convert WEATHER_STATUS to WEATHER_TYPES
 * @author WordlessEcho
 * @param {string} weatherStatus - one of `WEATHER_STATUS`
 * @returns {string} one of `WEATHER_TYPES`
 */
function weatherStatusToType(weatherStatus) {
	const {
		CLEAR,
		DRIZZLE,
		FLURRIES,
		SLEET,
		RAIN,
		SNOW,
		HEAVY_RAIN,
		HEAVY_SNOW,
	} = WEATHER_STATUS;

	switch (weatherStatus) {
		case CLEAR:
			return WEATHER_TYPES.CLEAR;
		case SLEET:
			return WEATHER_TYPES.SLEET;
		case FLURRIES:
		case SNOW:
		case HEAVY_SNOW:
			return WEATHER_TYPES.SNOW;
		case DRIZZLE:
		case RAIN:
		case HEAVY_RAIN:
		default:
			return WEATHER_TYPES.RAIN;
	}
};

/**
 * create Metadata
 * @author VirgilClyne
 * @param {Object} input - input
 * @returns {Object}
 */
function toMetadata(
	apiVersion, expireTimestamp, language, location, providerLogo,
	providerName, readTimestamp, reportedTimestamp, unit, dataSource,
) {
	const metadata = {
		"version": parseInt(apiVersion.slice(1)),
		language,
		"latitude": location?.latitude,
		"longitude": location?.longitude,
	};
	const expireTime = expireTimestamp
		? convertTime(apiVersion, new Date(expireTimestamp), 0, 0) : expireTimestamp;
	const readTime = readTimestamp
		? convertTime(apiVersion, new Date(readTimestamp), 0, 0) : readTimestamp;
	const reportedTime = reportedTimestamp
		? convertTime(apiVersion, new Date(reportedTimestamp), 0, 0) : reportedTimestamp;

	switch (apiVersion) {
		case "v1":
			metadata.expire_time = expireTime;
			metadata.provider_logo = providerLogo?.forV1;
			metadata.provider_name = providerName;
			metadata.read_time = readTime;
			metadata.reported_time = reportedTime;
			metadata.data_source = dataSource;
			// no units for APIv1
			break;
		case "v2":
		default:
			metadata.expireTime = expireTime;
			metadata.providerLogo = providerLogo?.forV2;
			metadata.providerName = providerName;
			metadata.readTime = readTime;
			metadata.reportedTime = reportedTime;
			metadata.units = unit;
			// no data source for APIv2
			break;
	}

	Object.keys(metadata).forEach(key => 
		(metadata[key] === null || metadata[key] === undefined || metadata[key] === NaN)
			&& delete metadata[key]
	);
	return metadata;
};

/**
 * convert iOS language into ColorfulClouds style
 * @author shindgewongxj
 * @author WordlessEcho
 * @param {string} languageWithReigon - "zh-Hans-CA", "en-US", "ja-CA" from Apple URL
 * @returns {string} https://docs.caiyunapp.com/docs/tables/lang
 */
 function toColorfulCloudsLang(languageWithReigon) {
	if (languageWithReigon.includes("en-US")) {
		return "en_US";
	} else if (languageWithReigon.includes("zh-Hans")) {
		return "zh_CN";
	} else if (languageWithReigon.includes("zh-Hant")) {
		return "zh_TW";
	} else if (languageWithReigon.includes("en-GB")) {
		return "en_GB";
	} else if (languageWithReigon.includes("ja")) {
		return "ja";
	} else {
		$.log(
			`⚠ ${$.name}, ColorfulClouds: unsupported language detected, fallback to en_US. `,
			`languageWithReigon = ${languageWithReigon}`, ""
		);
		return "en_US";
	}
};

/***************** Env *****************/
// prettier-ignore
// https://github.com/chavyleung/scripts/blob/master/Env.min.js
function Env(t,e){class s{constructor(t){this.env=t}send(t,e="GET"){t="string"==typeof t?{url:t}:t;let s=this.get;return"POST"===e&&(s=this.post),new Promise((e,i)=>{s.call(this,t,(t,s,r)=>{t?i(t):e(s)})})}get(t){return this.send.call(this.env,t)}post(t){return this.send.call(this.env,t,"POST")}}return new class{constructor(t,e){this.name=t,this.http=new s(this),this.data=null,this.dataFile="box.dat",this.logs=[],this.isMute=!1,this.isNeedRewrite=!1,this.logSeparator="\n",this.encoding="utf-8",this.startTime=(new Date).getTime(),Object.assign(this,e),this.log("",`\ud83d\udd14${this.name}, \u5f00\u59cb!`)}isNode(){return"undefined"!=typeof module&&!!module.exports}isQuanX(){return"undefined"!=typeof $task}isSurge(){return"undefined"!=typeof $httpClient&&"undefined"==typeof $loon}isLoon(){return"undefined"!=typeof $loon}isShadowrocket(){return"undefined"!=typeof $rocket}isStash(){return"undefined"!=typeof $environment&&$environment["stash-version"]}toObj(t,e=null){try{return JSON.parse(t)}catch{return e}}toStr(t,e=null){try{return JSON.stringify(t)}catch{return e}}getjson(t,e){let s=e;const i=this.getdata(t);if(i)try{s=JSON.parse(this.getdata(t))}catch{}return s}setjson(t,e){try{return this.setdata(JSON.stringify(t),e)}catch{return!1}}getScript(t){return new Promise(e=>{this.get({url:t},(t,s,i)=>e(i))})}runScript(t,e){return new Promise(s=>{let i=this.getdata("@chavy_boxjs_userCfgs.httpapi");i=i?i.replace(/\n/g,"").trim():i;let r=this.getdata("@chavy_boxjs_userCfgs.httpapi_timeout");r=r?1*r:20,r=e&&e.timeout?e.timeout:r;const[o,h]=i.split("@"),n={url:`http://${h}/v1/scripting/evaluate`,body:{script_text:t,mock_type:"cron",timeout:r},headers:{"X-Key":o,Accept:"*/*"}};this.post(n,(t,e,i)=>s(i))}).catch(t=>this.logErr(t))}loaddata(){if(!this.isNode())return{};{this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e);if(!s&&!i)return{};{const i=s?t:e;try{return JSON.parse(this.fs.readFileSync(i))}catch(t){return{}}}}}writedata(){if(this.isNode()){this.fs=this.fs?this.fs:require("fs"),this.path=this.path?this.path:require("path");const t=this.path.resolve(this.dataFile),e=this.path.resolve(process.cwd(),this.dataFile),s=this.fs.existsSync(t),i=!s&&this.fs.existsSync(e),r=JSON.stringify(this.data);s?this.fs.writeFileSync(t,r):i?this.fs.writeFileSync(e,r):this.fs.writeFileSync(t,r)}}lodash_get(t,e,s){const i=e.replace(/\[(\d+)\]/g,".$1").split(".");let r=t;for(const t of i)if(r=Object(r)[t],void 0===r)return s;return r}lodash_set(t,e,s){return Object(t)!==t?t:(Array.isArray(e)||(e=e.toString().match(/[^.[\]]+/g)||[]),e.slice(0,-1).reduce((t,s,i)=>Object(t[s])===t[s]?t[s]:t[s]=Math.abs(e[i+1])>>0==+e[i+1]?[]:{},t)[e[e.length-1]]=s,t)}getdata(t){let e=this.getval(t);if(/^@/.test(t)){const[,s,i]=/^@(.*?)\.(.*?)$/.exec(t),r=s?this.getval(s):"";if(r)try{const t=JSON.parse(r);e=t?this.lodash_get(t,i,""):e}catch(t){e=""}}return e}setdata(t,e){let s=!1;if(/^@/.test(e)){const[,i,r]=/^@(.*?)\.(.*?)$/.exec(e),o=this.getval(i),h=i?"null"===o?null:o||"{}":"{}";try{const e=JSON.parse(h);this.lodash_set(e,r,t),s=this.setval(JSON.stringify(e),i)}catch(e){const o={};this.lodash_set(o,r,t),s=this.setval(JSON.stringify(o),i)}}else s=this.setval(t,e);return s}getval(t){return this.isSurge()||this.isLoon()?$persistentStore.read(t):this.isQuanX()?$prefs.valueForKey(t):this.isNode()?(this.data=this.loaddata(),this.data[t]):this.data&&this.data[t]||null}setval(t,e){return this.isSurge()||this.isLoon()?$persistentStore.write(t,e):this.isQuanX()?$prefs.setValueForKey(t,e):this.isNode()?(this.data=this.loaddata(),this.data[e]=t,this.writedata(),!0):this.data&&this.data[e]||null}initGotEnv(t){this.got=this.got?this.got:require("got"),this.cktough=this.cktough?this.cktough:require("tough-cookie"),this.ckjar=this.ckjar?this.ckjar:new this.cktough.CookieJar,t&&(t.headers=t.headers?t.headers:{},void 0===t.headers.Cookie&&void 0===t.cookieJar&&(t.cookieJar=this.ckjar))}get(t,e=(()=>{})){if(t.headers&&(delete t.headers["Content-Type"],delete t.headers["Content-Length"]),this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient.get(t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){let s=require("iconv-lite");this.initGotEnv(t),this.got(t).on("redirect",(t,e)=>{try{if(t.headers["set-cookie"]){const s=t.headers["set-cookie"].map(this.cktough.Cookie.parse).toString();s&&this.ckjar.setCookieSync(s,null),e.cookieJar=this.ckjar}}catch(t){this.logErr(t)}}).then(t=>{const{statusCode:i,statusCode:r,headers:o,rawBody:h}=t;e(null,{status:i,statusCode:r,headers:o,rawBody:h},s.decode(h,this.encoding))},t=>{const{message:i,response:r}=t;e(i,r,r&&s.decode(r.rawBody,this.encoding))})}}post(t,e=(()=>{})){const s=t.method?t.method.toLocaleLowerCase():"post";if(t.body&&t.headers&&!t.headers["Content-Type"]&&(t.headers["Content-Type"]="application/x-www-form-urlencoded"),t.headers&&delete t.headers["Content-Length"],this.isSurge()||this.isLoon())this.isSurge()&&this.isNeedRewrite&&(t.headers=t.headers||{},Object.assign(t.headers,{"X-Surge-Skip-Scripting":!1})),$httpClient[s](t,(t,s,i)=>{!t&&s&&(s.body=i,s.statusCode=s.status),e(t,s,i)});else if(this.isQuanX())t.method=s,this.isNeedRewrite&&(t.opts=t.opts||{},Object.assign(t.opts,{hints:!1})),$task.fetch(t).then(t=>{const{statusCode:s,statusCode:i,headers:r,body:o}=t;e(null,{status:s,statusCode:i,headers:r,body:o},o)},t=>e(t));else if(this.isNode()){let i=require("iconv-lite");this.initGotEnv(t);const{url:r,...o}=t;this.got[s](r,o).then(t=>{const{statusCode:s,statusCode:r,headers:o,rawBody:h}=t;e(null,{status:s,statusCode:r,headers:o,rawBody:h},i.decode(h,this.encoding))},t=>{const{message:s,response:r}=t;e(s,r,r&&i.decode(r.rawBody,this.encoding))})}}time(t,e=null){const s=e?new Date(e):new Date;let i={"M+":s.getMonth()+1,"d+":s.getDate(),"H+":s.getHours(),"m+":s.getMinutes(),"s+":s.getSeconds(),"q+":Math.floor((s.getMonth()+3)/3),S:s.getMilliseconds()};/(y+)/.test(t)&&(t=t.replace(RegExp.$1,(s.getFullYear()+"").substr(4-RegExp.$1.length)));for(let e in i)new RegExp("("+e+")").test(t)&&(t=t.replace(RegExp.$1,1==RegExp.$1.length?i[e]:("00"+i[e]).substr((""+i[e]).length)));return t}msg(e=t,s="",i="",r){const o=t=>{if(!t)return t;if("string"==typeof t)return this.isLoon()?t:this.isQuanX()?{"open-url":t}:this.isSurge()?{url:t}:void 0;if("object"==typeof t){if(this.isLoon()){let e=t.openUrl||t.url||t["open-url"],s=t.mediaUrl||t["media-url"];return{openUrl:e,mediaUrl:s}}if(this.isQuanX()){let e=t["open-url"]||t.url||t.openUrl,s=t["media-url"]||t.mediaUrl,i=t["update-pasteboard"]||t.updatePasteboard;return{"open-url":e,"media-url":s,"update-pasteboard":i}}if(this.isSurge()){let e=t.url||t.openUrl||t["open-url"];return{url:e}}}};if(this.isMute||(this.isSurge()||this.isLoon()?$notification.post(e,s,i,o(r)):this.isQuanX()&&$notify(e,s,i,o(r))),!this.isMuteLog){let t=["","==============\ud83d\udce3\u7cfb\u7edf\u901a\u77e5\ud83d\udce3=============="];t.push(e),s&&t.push(s),i&&t.push(i),console.log(t.join("\n")),this.logs=this.logs.concat(t)}}log(...t){t.length>0&&(this.logs=[...this.logs,...t]),console.log(t.join(this.logSeparator))}logErr(t,e){const s=!this.isSurge()&&!this.isQuanX()&&!this.isLoon();s?this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t.stack):this.log("",`\u2757\ufe0f${this.name}, \u9519\u8bef!`,t)}wait(t){return new Promise(e=>setTimeout(e,t))}done(t={}){const e=(new Date).getTime(),s=(e-this.startTime)/1e3;this.log("",`\ud83d\udd14${this.name}, \u7ed3\u675f! \ud83d\udd5b ${s} \u79d2`),this.log(),(this.isSurge()||this.isQuanX()||this.isLoon())&&$done(t)}}(t,e)}

// https://github.com/VirgilClyne/VirgilClyne/blob/main/function/URL/URLs.embedded.min.js
function URLs(s){return new class{constructor(s=[]){this.name="URL v1.0.0",this.opts=s,this.json={url:{scheme:"",host:"",path:""},params:{}}}parse(s){let t=s.match(/(?<scheme>.+):\/\/(?<host>[^/]+)\/?(?<path>[^?]+)?\??(?<params>.*)?/)?.groups??null;return t?.params&&(t.params=Object.fromEntries(t.params.split("&").map((s=>s.split("="))))),t}stringify(s=this.json){return s?.params?s.scheme+"://"+s.host+"/"+s.path+"?"+Object.entries(s.params).map((s=>s.join("="))).join("&"):s.scheme+"://"+s.host+"/"+s.path}}(s)}
