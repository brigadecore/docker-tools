import { events, Event, Job } from "@brigadecore/brigadier"

const kanikoImg = "brigadecore/kaniko:v0.2.0"
const localPath = "/workspaces/docker-tools"

// MakeTargetJob is just a job wrapper around a make target.
class MakeTargetJob extends Job {
  constructor(target: string, img: string, event: Event, env?: {[key: string]: string}) {
    super(target, img, event)
    this.primaryContainer.sourceMountPath = localPath
    this.primaryContainer.workingDirectory = localPath
    this.primaryContainer.environment = env || {}
    this.primaryContainer.environment["SKIP_DOCKER"] = "true"
    this.primaryContainer.command = [ "make" ]
    this.primaryContainer.arguments = [ target ]
  }
}

// PushImageJob is a specialized job type for publishing Docker images.
class PushImageJob extends MakeTargetJob {
  constructor(target: string, event: Event, version?: string) {
    const env = {
      "DOCKER_ORG": event.project.secrets.dockerhubOrg,
      "DOCKER_USERNAME": event.project.secrets.dockerhubUsername,
      "DOCKER_PASSWORD": event.project.secrets.dockerhubPassword
    }
    if (version) {
      env["VERSION"] = version
    }
    super(target, kanikoImg, event, env)
  }
}

// A map of all jobs. When a check_run:rerequested event wants to re-run a
// single job, this allows us to easily find that job by name.
const jobs: {[key: string]: (event: Event) => Job } = {}

// Build / publish stuff:

const buildJobName = "build"
const buildJob = (event: Event) => {
  return new MakeTargetJob(buildJobName, kanikoImg, event)
}
jobs[buildJobName] = buildJob

const pushJobName = "push"
const pushJob = (event: Event, version?: string) => {
  return new PushImageJob(pushJobName, event, version)
}
jobs[pushJobName] = pushJob

// Just build, unless this is a merge to main, then build and push.
async function runSuite(event: Event): Promise<void> {
  if (event.worker?.git?.ref != "main") {
    // Just build
    await buildJob(event).run()
  } else {
    // Build and push
    await pushJob(event).run()
  }
}

// Either of these events should initiate execution of the entire test suite.
events.on("brigade.sh/github", "check_suite:requested", runSuite)
events.on("brigade.sh/github", "check_suite:rerequested", runSuite)

// This event indicates a specific job is to be re-run.
events.on("brigade.sh/github", "check_run:rerequested", async event => {
  // Check run names are of the form <project name>:<job name>, so we strip
  // event.project.id.length + 1 characters off the start of the check run name
  // to find the job name.
  const jobName = JSON.parse(event.payload).check_run.name.slice(event.project.id.length + 1)
  const job = jobs[jobName]
  if (job) {
    await job(event).run()
    return
  }
  throw new Error(`No job found with name: ${jobName}`)
})

events.on("brigade.sh/github", "release:published", async event => {
  const version = JSON.parse(event.payload).release.tag_name
  await pushJob(event, version).run()
})

events.process()
