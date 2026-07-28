import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import esbuildPluginPino from "esbuild-plugin-pino";

globalThis.require = createRequire(import.meta.url);
const artifactDir = path.dirname(fileURLToPath(import.meta.url));

await build({
  entryPoints: [path.resolve(artifactDir, "src/serverless.ts")],
  platform: "node",
  bundle: true,
  format: "esm",
  outdir: path.resolve(artifactDir, "api"),
  logLevel: "info",
  external: [
    "*.node","sharp","better-sqlite3","sqlite3","canvas","bcrypt","argon2",
    "fsevents","re2","farmhash","xxhash-addon","bufferutil","utf-8-validate",
    "ssh2","cpu-features","pg-native","oracledb","mongodb-client-encryption",
    "nodemailer","knex","typeorm","onnxruntime-node","@tensorflow/*",
    "@prisma/client","@mikro-orm/*","@grpc/*","@swc/*","@aws-sdk/*",
    "@azure/*","@opentelemetry/*","@google-cloud/*","googleapis",
    "firebase-admin","@parcel/watcher","@sentry/profiling-node",
    "@tree-sitter/*","aws-sdk","classic-level","dd-trace","grpc",
    "hiredis","kerberos","leveldown","mysql2","newrelic","odbc",
    "realm","rocksdb","sequelize","serialport","snappy","usb",
    "workerd","wrangler","zeromq","playwright","puppeteer","electron",
  ],
  sourcemap: false,
  plugins: [esbuildPluginPino({ transports: ["pino-pretty"] })],
  banner: {
    js: `import { createRequire as __cr } from 'node:module';
import __p from 'node:path';
import __u from 'node:url';
globalThis.require = __cr(import.meta.url);
globalThis.__filename = __u.fileURLToPath(import.meta.url);
globalThis.__dirname = __p.dirname(globalThis.__filename);
`,
  },
});
