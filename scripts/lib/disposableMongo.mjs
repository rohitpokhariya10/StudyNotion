import { spawn } from "node:child_process"
import { once } from "node:events"
import { mkdtemp, rm } from "node:fs/promises"
import { createServer } from "node:net"
import { tmpdir } from "node:os"
import { join } from "node:path"
import mongoose from "mongoose"

// A throwaway mongod in a new empty directory on an OS-assigned loopback
// port, run as a single-node replica set so compare-and-set updates and
// majority writes behave as in production. It never touches a developer DB.

export const freePort = async () => {
  const probe = createServer()
  probe.listen(0, "127.0.0.1")
  await once(probe, "listening")
  const { port } = probe.address()
  await new Promise((resolve) => probe.close(resolve))
  return port
}

export const startDisposableMongo = async ({
  replicaSet = "neet-disposable",
  prefix = "studynotion-neet-mongo-",
} = {}) => {
  const directory = await mkdtemp(join(tmpdir(), prefix))
  const port = await freePort()
  const mongo = spawn(
    process.env.MONGOD_BIN || "mongod",
    [
      "--dbpath",
      directory,
      "--port",
      String(port),
      "--bind_ip",
      "127.0.0.1",
      "--nounixsocket",
      "--replSet",
      replicaSet,
    ],
    { stdio: ["ignore", "pipe", "pipe"] }
  )
  let output = ""
  const stop = async ({ keepDirectory = false } = {}) => {
    const ended = once(mongo, "exit")
    if (mongo.exitCode === null) {
      mongo.kill("SIGTERM")
      await ended
    }
    if (!keepDirectory) await rm(directory, { recursive: true, force: true })
  }
  try {
    await new Promise((resolve, reject) => {
      const deadline = setTimeout(
        () =>
          reject(new Error(`Mongo startup timed out: ${output.slice(-2000)}`)),
        20000
      )
      mongo.once("error", reject)
      mongo.once("exit", (code) => {
        clearTimeout(deadline)
        reject(new Error(`Mongo exited ${code}: ${output.slice(-2000)}`))
      })
      const read = (chunk) => {
        output += String(chunk)
        if (String(chunk).includes("Waiting for connections")) {
          clearTimeout(deadline)
          resolve()
        }
      }
      mongo.stdout.on("data", read)
      mongo.stderr.on("data", read)
    })
    const admin = new mongoose.mongo.MongoClient(
      `mongodb://127.0.0.1:${port}/?directConnection=true`
    )
    await admin.connect()
    try {
      await admin.db("admin").command({
        replSetInitiate: {
          _id: replicaSet,
          members: [{ _id: 0, host: `127.0.0.1:${port}` }],
        },
      })
      const deadline = Date.now() + 20000
      for (;;) {
        const hello = await admin.db("admin").command({ hello: 1 })
        if (hello.isWritablePrimary) break
        if (Date.now() > deadline) throw new Error("Replica set did not elect")
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    } finally {
      await admin.close()
    }
  } catch (error) {
    await stop({ keepDirectory: true }).catch(() => {})
    throw error
  }
  return {
    directory,
    port,
    uri: (database) => `mongodb://127.0.0.1:${port}/${database}`,
    stop,
  }
}
