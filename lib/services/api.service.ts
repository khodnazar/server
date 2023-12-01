// geo ip stuff
import geoip from "geoip-lite";
// moleculer
import type { ServiceSchema } from "moleculer";
// lib
import ApiService from "../api/index";
import { I18nMixin } from "../i18n";
// package.json
import packageJson from "../../package.json";
// get config from env

const Service: ServiceSchema = {
	name: "api",

	/**
	 * Service mixins
	 */
	mixins: [ApiService as any, I18nMixin],

	/**
	 * Service settings
	 */
	settings: {
		// Exposed port
		port: process.env.PORT ?? 3000,

		// Exposed IP
		ip: process.env.IP ?? process.env.HOST ?? "0.0.0.0",

		routes: [
			// use swagger service if MOLECULER_SWAGGER is true
			(process.env.MOLECULER_SWAGGER as any) == true ||
			(process.env.MOLECULER_SWAGGER as any) == "true"
				? {
						path: "/api/openapi",
						aliases: {
							"GET /json": "openapi.generateDocs", // swagger scheme
							"GET /openapi.json": "openapi.generateDocs", // swagger scheme
							"GET /ui": "openapi.ui", // ui
							"GET /assets/:file": "openapi.assets", // js/css files
						},
				  }
				: undefined,
			// use admin service if MOLECULER_API_PUBLIC is true
			(process.env.MOLECULER_API_PUBLIC as any) == true ||
			(process.env.MOLECULER_API_PUBLIC as any) == "true"
				? {
						path: "/api/admin",
						whitelist: ["$node.*"],
						cors: {
							origin: "*",
						},
				  }
				: undefined,
			{
				path: "/",
				whitelist: [/^api\./],
				bodyParsers: {
					multipart: {
						maxFileSize: 10 * 1024 * 1024, // 10MB (adjust as needed)
					},
					json: {
						strict: false,
						limit: "3MB",
					},
					urlencoded: {
						extended: true,
						limit: "3MB",
						parameterLimit: 5000 * 5,
					},
				},
				busboyConfig: {
					limits: { files: 1 },
					// Can be defined limit event handlers
					// `onPartsLimit`, `onFilesLimit` or `onFieldsLimit`
				},
				cors: {
					origin: "*",
					methods: ["GET", "POST", "OPTIONS", "PUT", "PATCH", "HEAD", "DELETE"],
					allowedHeaders: [
						"content-type",
						"authorization",
						"accept-language",
						"x-referer",
						"x-fingerprint",
						"x-i18n",
						"x-creator",
					],
					exposedHeaders: [],
					credentials: false,
					maxAge: 3600,
				},
				authentication: true,
				autoAliases: true,
				callOptions: {
					timeout: 10000,
					retries: 3,
				},
				onBeforeCall(ctx: any, _: any, req: any, res: any) {
					const token = req.headers.authorization ?? req.query.token;

					if (token) {
						ctx.meta.accessToken = token.replace("Bearer ", "");
					} else {
						ctx.meta.accessToken = undefined;
					}

					// set user ip address to meta
					ctx.meta.ip =
						req.headers["x-ip"] ||
						req.headers["x-forwarded-for"] ||
						req.connection.remoteAddress;

					// set geoip to meta
					if (ctx.meta.ip) {
						ctx.meta.geoip = geoip.lookup(ctx.meta.ip);
					}

					// set userAgent to meta
					ctx.meta.userAgent = req.headers["user-agent"];

					// set referer to meta
					ctx.meta.referer = req.headers["x-referer"] || req.headers.referer;

					// set fingerprint to meta
					ctx.meta.fingerprint = req.headers["x-fingerprint"];

					// set i18n to meta
					ctx.meta.locale = ctx.meta.i18n =
						req.headers["Accept-Language"] ??
						req.headers["accept-language"] ??
						req.headers["x-i18n"] ??
						"en";

					// set creator to meta
					if (req.headers["x-creator"]) {
						ctx.meta.creator = req.headers["x-creator"];
					}

					// set start request time to meta
					ctx.meta.requestedAt = Date.now();
				},
				async onAfterCall(ctx: any, route: any, req: any, res: any, data: any) {
					// set end request time to meta
					ctx.meta.respondedAt = Date.now();

					if (data && data.code) {
						res.statusCode = data.code;
					}

					// emit log.request event if statusCode was not 200
					if (res.statusCode === 500) {
						ctx.emit("log.request", {
							method: req.method,
							path: req.url,
							start: ctx.meta.requestedAt,
							end: ctx.meta.respondedAt,
							status: res.statusCode,
						});
					}

					// if statusCode is 301, redirect it
					if (res.statusCode == 301) {
						// redirect to data.data
						res.writeHead(res.statusCode, {
							Location: data.data,
						});

						res.end();
						return;
					}

					// check in data is data['i18n'] then translate it to user language with x-i18n header and change data.message and remove data.i18n
					if (data && data.i18n) {
						ctx.$action = req.$action;
						const message = this.translate(ctx, data);
						if (message) {
							data.message = message;
							delete data.i18n;
						}
					}

					// use some default i18n when there was no data['i18n'] and data['message']
					if (data && !data.i18n && !data.message) {
						switch (data.code) {
							case 500:
								data.message = this.translate(ctx, {
									i18n: "#INTERNAL_SERVER_ERROR",
								});
								break;

							default:
								break;
						}
					}

					// check res.statusCode and make boolean status
					data.status = [200].includes(res.statusCode);

					return {
						status: data.status,
						code: data.code,
						message: data.message,
						meta: data.meta,
						data: data.data,
						timeing:
							(process.env.MOLECULER_API_TIMING as any) == "true" ||
							(process.env.MOLECULER_API_TIMING as any) == true
								? {
										start: ctx.meta.requestedAt,
										end: ctx.meta.respondedAt,
										took: ctx.meta.respondedAt - ctx.meta.requestedAt,
								  }
								: undefined,
					};
				},
				onError(req: any, res: any, err: any) {
					res.setHeader("Content-Type", "application/json; charset=utf-8");

					const ctx = req.$ctx;

					if (typeof err === "undefined" || typeof err.code === "undefined") {
						res.writeHead(500);
						res.end(
							JSON.stringify({
								status: false,
								code: 500,
								message: this.translate(ctx, {
									i18n: "#INTERNAL_SERVER_ERROR",
								}),
								debug: err.toString(),
							})
						);
						return;
					}

					res.writeHead(err.code);
					switch (err.code) {
						case 401:
							res.end(
								JSON.stringify({
									status: false,
									code: 401,
									message: this.translate(ctx, err.data),
									data: err.data.data,
								})
							);
							break;

						case 404:
							if (req.url === "/") {
								res.end(
									JSON.stringify({
										status: true,
										code: 200,
										message: this.translate(ctx, {
											i18n: "#WELCOME",
											data: {
												name: packageJson.name,
												version: packageJson.version,
											},
										}), // `Welcome to ${packageJson.name} v${packageJson.version}`,
										data: {
											name: packageJson.name,
											version: packageJson.version,
											description: packageJson.description,
											author: packageJson.author,
											license: packageJson.license,
											repository: packageJson.repository.url,
											homepage: packageJson.homepage,
											documentation: `/api/openapi/ui`,
										},
									})
								);
							} else {
								res.end(
									JSON.stringify({
										status: false,
										code: 404,
										message: this.translate(ctx, { i18n: "#NOT_FOUND" }),
									})
								);
							}
							break;

						case 422:
							res.end(
								JSON.stringify({
									status: false,
									code: 422,
									message: this.translate(ctx, {
										i18n: "#UNPROCESSABLE_ENTITY",
									}),
									data: err.data.map((item: any) => ({
										field: item.field,
										type: item.type,
										message: item.message,
									})),
								})
							);
							break;

						default:
							res.end(
								JSON.stringify({
									status: false,
									code: 500,
									message: this.translate(ctx, {
										i18n: "#INTERNAL_SERVER_ERROR",
									}),
									debug: err.toString(),
								})
							);
							break;
					}
				},
			},
		],

		assets:
			(process.env.MOLECULER_API_PUBLIC as any) == false ||
			(process.env.MOLECULER_API_PUBLIC as any) == "false"
				? null
				: {
						// Root folder of assets
						folder: "./public",

						// Further options to `serve-static` module
						options: {},
				  },
	},

	/**
	 * Service dependencies
	 */
	// dependencies: [],

	/**
	 * Actions
	 */
	actions: {},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {
		async authenticate(ctx, route, req, res) {
			const { permission } = req.$action;

			// action in service doesn't need to auth
			if (typeof permission === "undefined") {
				return Promise.resolve(undefined);
			}

			for (let i in permission) {
				let item = permission[i];
				// check if permission has '{' and '}' in it
				if (item.includes("{") && item.includes("}")) {
					// find all '{' and '}' in permission
					const permissionParams = item.match(/{(.*?)}/g);

					for (let param of permissionParams) {
						// remove '{' and '}' from param
						const paramName = param.replace("{", "").replace("}", "");

						if (req.$params[paramName] != undefined) {
							// get param value from ctx.params
							const paramValue = req.$params[paramName];

							// replace param with param value
							item = item.replace(param, paramValue);

							// set new permission
							permission[i] = item;
						}
					}
				}
			}

			const token = ctx.meta.accessToken;

			if (!token || token.length === 0) {
				return Promise.reject(
					new ApiService.Errors.UnAuthorizedError(
						ApiService.Errors.ERR_NO_TOKEN,
						{
							error: "No token provided",
						}
					)
				);
			}

			// call token service on action whoisthis
			const result = await ctx.call("api.v1.token.whoisthis", {
				token,
				permissions: permission ?? [],
			});

			if (result.code != 200) {
				return Promise.reject(
					new ApiService.Errors.UnAuthorizedError(
						ApiService.Errors.ERR_INVALID_TOKEN,
						result
					)
				);
			}

			ctx.meta.accessPayload = result.data.payload;
			ctx.meta.accessPermissions = result.data.permissions;
			ctx.meta.accessWhoisthis = result.data.whoisthis;

			return Promise.resolve(result.data);
		},
	},

	/**
	 * Service created lifecycle event handler
	 */
	// created() {},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {
		// clear cache
		if (this.broker.cacher) {
			await this.broker.cacher.clean();
		}

		// emit event to log service
		await this.broker.emit("log.info", {
			message: "🟢 Api service started",
			service: "api",
			method: "started",
			tags: ["hello"],
			data: {
				timestamp: Date.now(),
				date: new Date(),
			},
		});
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {
		// emit event to log service
		await this.broker.emit("log.info", {
			message: "🔴 Api service stopped",
			service: "api",
			method: "stopped",
			tags: ["goodbye"],
			data: {
				timestamp: Date.now(),
				date: new Date(),
			},
		});
	},
};

export = Service;
