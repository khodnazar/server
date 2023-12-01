// this middleware pass every calling actions from other nodes to a meta data named creator and save it like: node:{NODE_NAME}

export const MiddlewareCreator = {
	localAction(next: any, _: any) {
		return (ctx: any) => {
			const sender = ctx.nodeID;

			if (sender && !ctx.meta.creator) {
				ctx.meta.creator = `node:${sender.toLowerCase()}`;
			}

			return next(ctx);
		};
	},
};
