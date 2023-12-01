// create a queue servuce with bull for moleculer
import type { ServiceSchema } from "moleculer";

import bull from "bull";
import _ from "lodash";

export const QueueMixin: ServiceSchema = {
	name: "queue",
	version: "v1",

	methods: {
		callQueue(queueName: string, data: any = {}) {
			return this.$queues[queueName].add(data);
		},
	},

	created() {
		this.$queues = {};
	},

	started() {
		let params = this.schema.settings
			? this.schema.settings.queue
			: {
					redis: "redis://localhost:6379",
			  };

		if (typeof params === "undefined") {
			throw new Error("Queue settings is not defined");
		}

		/*
            @example
            queues: [
                {
                    name: "email",
                    cuncurrency: 10,
                    handler: (job) => {
                        // do something
                    }
                }
            ]
        */

		if (this.schema.queues && Array.isArray(this.schema.queues)) {
			this.schema.queues.forEach((queue) => {
				const queueName = _.get(queue, "name", "default");
				const queueConcurrency = _.get(queue, "concurrency", 1);
				const queueHandler = _.get(queue, "handler", () => {});

				this.$queues[queueName] = new bull(queueName, {
					redis: params.redis,
					defaultJobOptions: {
						removeOnComplete: true,
						removeOnFail: true,
					},
				});

				this.$queues[queueName].process(
					queueConcurrency,
					queueHandler.bind(this)
				);
			});
		}
	},
};
