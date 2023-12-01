// create a queue servuce with bull for moleculer
import type { ServiceSchema } from "moleculer";

import { I18nMixin as mixin } from "@codeyard/moleculer-i18n";
import Polyglot from "node-polyglot";

import fs from "fs";
import path from "path";
import Moleculer from "moleculer";

import { DotResponse } from "../../types";

export const I18nMixin: ServiceSchema = {
	name: "i18n",
	version: "v1",

	mixins: [mixin],

	settings: {
		i18n: {
			dirName: process.env.MOLECULER_I18N_DIR ?? "locales",
			languages: process.env.MOLECULER_I18N_LANGUAGES?.split(",") ?? ["en"],
			defaultLanguage: process.env.MOLECULER_I18N_DEFAULT_LANGUAGE ?? "en",
			polyglot: new Polyglot(),
		},
	},

	methods: {
		translate(
			ctx: Moleculer.Context<any, any, Moleculer.GenericObject>,
			input: DotResponse
		) {
			let key = "";
			const name = (ctx as any).$action ? (ctx as any).$action.name : undefined;

			if (input.i18n!.startsWith("#") || name == undefined) {
				key = input.i18n!.replace("#", "");
			} else {
				// get service name and version and action name
				key = `${name}.${input.i18n}`;
			}

			const message = this.t(ctx, key, input.data ?? {});

			// if message endsWith key, means that the key is not found and should write to file
			if (message.endsWith(key)) {
				this.defineTranslations(ctx, key);
				return undefined;
			}

			return message;
		},

		defineTranslations(
			ctx: Moleculer.Context<any, any, Moleculer.GenericObject>,
			key: string = "",
			value: string = ""
		) {
			const _key =
				key && key.length != 0
					? key
					: (ctx as any).$action && (ctx as any).$action.name
					? `${(ctx as any).$action.name}.${key}`
					: key;

			this.settings.i18n.polyglot.extend({
				[_key]: value,
			});

			// write to file
			const dirName = this.settings.i18n.dirName;
			const languages = this.settings.i18n.languages;

			for (let language of languages) {
				const file = path.join(process.cwd(), dirName, `${language}.json`);

				fs.readFile(file, "utf8", (err, data) => {
					if (err) {
						return;
					}

					const _data = JSON.parse(data);
					_data[_key] = value;

					fs.writeFile(file, JSON.stringify(_data, null, 4), (err) => {
						if (err) {
							return;
						}
					});
				});

				// add to polyglot
				this.settings.i18n.polyglot.extend({
					[language + "." + _key]: value,
				});
			}
		},
	},

	created() {
		const dirName = this.settings.i18n.dirName;

		// check if dir exists
		const dir = path.join(process.cwd(), dirName);

		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir);
		}

		// check if files exists
		const languages = this.settings.i18n.languages;

		for (let language of languages) {
			const file = path.join(dir, `${language}.json`);

			if (!fs.existsSync(file)) {
				fs.writeFileSync(file, JSON.stringify({}));
			}
		}
	},
};
