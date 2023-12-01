import {
	ServiceSettingSchema,
	ServiceDependency,
	ServiceMethods,
	ServiceHooks,
	ServiceEvents,
	ServiceSyncLifecycleHandler,
	ServiceAsyncLifecycleHandler,
	ActionHandler,
	ActionSchema,
	Service,
} from "moleculer";

interface CustomServiceActionsSchema extends ActionSchema {
	permission?: string[];
	handler?: ActionHandler<DotResponse>;
}

type ServiceActionsSchema<S = ServiceSettingSchema> = {
	[key: string]: CustomServiceActionsSchema | ActionHandler | boolean;
} & ThisType<Service<S>>;

export interface ServiceSchema<S = ServiceSettingSchema> {
	name: string;
	version?: string | number;
	settings?: S;
	dependencies?: string | ServiceDependency | (string | ServiceDependency)[];
	metadata?: any;
	actions?: ServiceActionsSchema;
	mixins?: Partial<ServiceSchema>[];
	methods?: ServiceMethods;
	hooks?: ServiceHooks;

	events?: ServiceEvents;
	created?: ServiceSyncLifecycleHandler<S> | ServiceSyncLifecycleHandler<S>[];
	started?: ServiceAsyncLifecycleHandler<S> | ServiceAsyncLifecycleHandler<S>[];
	stopped?: ServiceAsyncLifecycleHandler<S> | ServiceAsyncLifecycleHandler<S>[];

	[name: string]: any;
}

export interface DotResponse {
	status?: boolean; // becuase of code we don't need boolean status
	code: number | 200 | 301 | 400 | 404 | 500;
	error?: number | -1 | 400 | 404 | 500; // becuase of i18n we don't need it
	i18n?: string;
	message?: string;
	meta?: {
		page?: number;
		limit?: number;
		last?: number;
		total?: number;

		[key: string]: any;
	};
	data?: any;

	[key: string]: any;
}
