import { ServiceSchema } from "../lib/types";

const Service: ServiceSchema = {
	name: "test",
	version: "api.v1",

	/**
	 * Service settings
	 */
	settings: {},

	/**
	 * Service dependencies
	 */
	// dependencies: [],

	/**
	 * Actions
	 */
	actions: {
		get: {
			rest: "GET /",
			params: {
				creator: {
					type: "string",
					optional: true,
				},
			},
			async handler(ctx) {
				const creator = ctx.meta.creator ?? ctx.params.creator;

				return {
					code: 200,
					i18n: "all-good",
					data: {
						creator,
					},
				};
			},
		},
	},

	/**
	 * Events
	 */
	events: {},

	/**
	 * Methods
	 */
	methods: {},

	/**
	 * Service created lifecycle event handler
	 */
	// created() {},

	/**
	 * Service started lifecycle event handler
	 */
	// started() { },

	/**
	 * Service stopped lifecycle event handler
	 */
	// stopped() { }
};

export = Service;
