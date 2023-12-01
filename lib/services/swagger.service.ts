import { ServiceSchema } from "moleculer";
// swagger
import OpenAPI from "../swagger";
// package.json
import packageJson from "../../package.json";

const Service: ServiceSchema = {
	name: "openapi",

	mixins: [OpenAPI],

	/**
	 * Service settings
	 */
	settings: {
		openapi: {
			info: {
				title: packageJson.name,
				description: packageJson.description,
			},
			tags: [],
			components: {
				securitySchemes: {
					Authorization: {
						type: 'http',
						scheme: 'bearer',
					},
				},
			},
            security: [{
				Authorization: []
			}]
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
