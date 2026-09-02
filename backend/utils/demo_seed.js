const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Project = require('../models/Project');
const Task = require('../models/Task');
const TaskTimeline = require('../models/TaskTimeline');
const AlertDismissal = require('../models/AlertDismissal');

const runDemoSeed = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/project-tracker';
    console.log(`Connecting to MongoDB: ${mongoUri.split('@')[1] || mongoUri}...`);
    await mongoose.connect(mongoUri);
    console.log('MongoDB Connected successfully.');

    // 1. CLEAR ALL PREVIOUS TEST & DRAFT DATA
    console.log('\n--- Purging existing data from all collections ---');
    await TaskTimeline.collection.deleteMany({});
    await AlertDismissal.collection.deleteMany({});
    await Task.collection.deleteMany({});
    await Project.collection.deleteMany({});
    await User.collection.deleteMany({});
    console.log('✔ All collections successfully purged.');

    // 2. CREATE REALISTIC USERS & ROLES
    console.log('\n--- Creating Demo Users ---');
    const managerPassword = process.env.DEMO_MANAGER_PASSWORD || 'manager123';
    const memberPassword = process.env.DEMO_MEMBER_PASSWORD || 'member123';

    const users = await User.create([
      {
        email: 'manager@example.com',
        name: 'Elena Rostova',
        password: managerPassword,
        role: 'manager',
      },
      {
        email: 'member1@example.com',
        name: 'Alice Walker',
        password: memberPassword,
        role: 'member',
      },
      {
        email: 'member2@example.com',
        name: 'Bob Chen',
        password: memberPassword,
        role: 'member',
      },
      {
        email: 'member3@example.com',
        name: 'David Kim',
        password: memberPassword,
        role: 'member',
      },
    ]);

    const [elena, alice, bob, david] = users;
    console.log(`✔ Created 1 Manager (${elena.email}) and 3 Members (${alice.email}, ${bob.email}, ${david.email})`);

    // 3. CREATE MULTIPLE CLIENT PROJECTS (Active & Archived)
    console.log('\n--- Creating Client Projects ---');
    const projects = await Project.create([
      {
        key: 'APOLLO',
        name: 'Apollo Health Portal',
        description: 'Next-generation patient records and HIPAA-compliant telehealth consultation portal for Apollo Medical Group.',
        owner: elena._id,
        members: [elena._id, alice._id, bob._id], // Alice and Bob
        isArchived: false,
      },
      {
        key: 'NEXUS',
        name: 'Nexus FinTech Mobile',
        description: 'Cross-platform mobile banking, KYC verification, and peer-to-peer micro-transfers application for Nexus Capital.',
        owner: elena._id,
        members: [elena._id, alice._id, david._id], // Alice and David (Bob cannot see this project!)
        isArchived: false,
      },
      {
        key: 'CYBER',
        name: 'CyberShield Infrastructure Audit',
        description: 'Zero-trust network architecture refactor, penetration testing, and SOC2 compliance automation.',
        owner: elena._id,
        members: [elena._id, bob._id, david._id], // Bob and David (Alice cannot see this project!)
        isArchived: false,
      },
      {
        key: 'LEGACY',
        name: 'Legacy Migration Q2',
        description: 'Historical COBOL billing pipeline deprecation and data reconciliation into PostgreSQL.',
        owner: elena._id,
        members: [elena._id, alice._id, bob._id, david._id],
        isArchived: true, // Archived project to demonstrate archive filter & restoration
      },
    ]);

    const [apollo, nexus, cyber, legacy] = projects;
    console.log(`✔ Created 3 Active projects (APOLLO, NEXUS, CYBER) and 1 Archived project (LEGACY)`);

    // Helper dates
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // 4. CREATE REALISTIC TASKS, DEPENDENCIES & ASSIGNMENTS
    console.log('\n--- Creating Tasks across Projects ---');

    // === APOLLO TASKS ===
    // Blocker task
    const tApollo1 = await Task.create({
      projectId: apollo._id,
      title: 'Audit HIPAA Token Storage & Redis Sessions',
      description: 'Review Redis session encryption and ensure authentication tokens in transit are strictly encrypted with AES-256-GCM.',
      status: 'done',
      priority: 'high',
      dueDate: new Date(now - 5 * day),
      assignees: [bob._id],
    });

    // Dependent task
    const tApollo2 = await Task.create({
      projectId: apollo._id,
      title: 'Deploy OAuth2 Single Sign-On Provider',
      description: 'Integrate Okta OpenID Connect authentication provider for enterprise hospital logins.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(now + 3 * day),
      assignees: [alice._id, bob._id], // Multiple assignees
      blockers: [tApollo1._id],
    });

    // Overdue task
    const tApollo3 = await Task.create({
      projectId: apollo._id,
      title: 'Refactor Legacy FHIR Ingestion Pipeline',
      description: 'Batch processor times out when importing patient records exceeding 50MB. Requires stream-based pipeline.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(now - 2 * day), // OVERDUE!
      assignees: [alice._id],
    });

    // In Review task
    const tApollo4 = await Task.create({
      projectId: apollo._id,
      title: 'Design Mobile Patient Triage Interface',
      description: 'Create low-latency emergency triage questionnaire for iOS and Android responsive webviews.',
      status: 'in_review',
      priority: 'medium',
      dueDate: new Date(now + 1 * day),
      assignees: [alice._id],
    });

    // Blocked task
    const tApollo5 = await Task.create({
      projectId: apollo._id,
      title: 'Implement Telehealth WebRTC Signaling Server',
      description: 'Configure STUN/TURN servers on AWS EC2 and setup secure signaling channel for live video consultations.',
      status: 'blocked',
      preBlockedStatus: 'in_progress',
      priority: 'high',
      dueDate: new Date(now + 6 * day),
      assignees: [bob._id],
      blockers: [tApollo2._id],
    });

    // Backlog task
    const tApollo6 = await Task.create({
      projectId: apollo._id,
      title: 'Automate End-to-End EHR Sync Testing',
      description: 'Write Playwright test suites covering full doctor consultation and EHR synchronization lifecycle.',
      status: 'backlog',
      priority: 'low',
      dueDate: new Date(now + 14 * day),
      assignees: [alice._id],
    });

    // === NEXUS TASKS ===
    // Blocker task
    const tNexus1 = await Task.create({
      projectId: nexus._id,
      title: 'Finalize KYC Verification Webhook Handler',
      description: 'Verify identity documents against Jumio API and process asynchronous approval callbacks.',
      status: 'done',
      priority: 'high',
      dueDate: new Date(now - 12 * day),
      assignees: [alice._id],
    });

    // Dependent In Review task
    const tNexus2 = await Task.create({
      projectId: nexus._id,
      title: 'Implement Stripe Payment Intent API',
      description: 'Support multi-currency instant payouts and handle 3D Secure 2.0 verification challenges.',
      status: 'in_review',
      priority: 'high',
      dueDate: new Date(now + 2 * day),
      assignees: [alice._id, david._id], // Multiple assignees
      blockers: [tNexus1._id],
    });

    // Overdue task
    const tNexus3 = await Task.create({
      projectId: nexus._id,
      title: 'Resolve Biometric FaceID Crash on iOS 18',
      description: 'LocalAuthentication framework throws unhandled exception on Swift 6 runtime during biometric challenge.',
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(now - 3 * day), // OVERDUE!
      assignees: [david._id],
    });

    // Backlog task
    const tNexus4 = await Task.create({
      projectId: nexus._id,
      title: 'Export Monthly Transaction Settlement CSV',
      description: 'Provide accounting downloadable CSV breakdown of card settlements and interchange fees.',
      status: 'backlog',
      priority: 'medium',
      dueDate: new Date(now + 8 * day),
      assignees: [david._id],
    });

    // Done task
    const tNexus5 = await Task.create({
      projectId: nexus._id,
      title: 'Design Dark Mode Liquidity Dashboard',
      description: 'Implement high-contrast dark theme for portfolio overview with accessible color contrast.',
      status: 'done',
      priority: 'low',
      dueDate: new Date(now - 16 * day),
      assignees: [david._id],
    });

    // === CYBER TASKS ===
    // Overdue task
    const tCyber1 = await Task.create({
      projectId: cyber._id,
      title: 'Renew Production SSL Wildcard Certificates',
      description: "Let's Encrypt automated certbot renew failed due to Route53 DNS TXT record permissions.",
      status: 'in_progress',
      priority: 'high',
      dueDate: new Date(now - 1 * day), // OVERDUE!
      assignees: [bob._id],
    });

    // In Review task
    const tCyber2 = await Task.create({
      projectId: cyber._id,
      title: 'Penetration Test Internal GraphQL Endpoints',
      description: 'Verify query depth limiters and ensure schema introspection is disabled in production.',
      status: 'in_review',
      priority: 'high',
      dueDate: new Date(now + 4 * day),
      assignees: [bob._id],
    });

    // Done task
    const tCyber3 = await Task.create({
      projectId: cyber._id,
      title: 'Migrate Bastion Hosts to Tailscale WireGuard',
      description: 'Replace public SSH bastion jumpboxes with zero-trust Tailscale subnet routers.',
      status: 'done',
      priority: 'medium',
      dueDate: new Date(now - 22 * day),
      assignees: [bob._id, david._id], // Multiple assignees
    });

    // Backlog task
    const tCyber4 = await Task.create({
      projectId: cyber._id,
      title: 'Configure SOC2 Compliance Evidence Collector',
      description: 'Script automatic daily capture of AWS CloudTrail logs and IAM policy revisions.',
      status: 'backlog',
      priority: 'low',
      dueDate: new Date(now + 20 * day),
      assignees: [david._id],
    });

    // === LEGACY TASKS (In archived project) ===
    await Task.create([
      {
        projectId: legacy._id,
        title: 'Extract Historical Billing Records 2020-2024',
        description: 'Dump COBOL flat files to S3 bucket and run checksum validation.',
        status: 'done',
        priority: 'medium',
        dueDate: new Date(now - 55 * day),
        assignees: [bob._id],
      },
      {
        projectId: legacy._id,
        title: 'Decommission AS400 Mainframe Gateway',
        description: 'Terminate VPN tunnel and remove routing tables.',
        status: 'done',
        priority: 'low',
        dueDate: new Date(now - 40 * day),
        assignees: [alice._id],
      },
    ]);

    console.log('✔ Successfully created 17 realistic tasks across active and archived projects.');

    // 5. CREATE HISTORICAL TIMELINE EVENTS & MEANINGFUL COMMENTS
    console.log('\n--- Seeding Immutable Timelines & Comments ---');
    const allTasks = [tApollo1, tApollo2, tApollo3, tApollo4, tApollo5, tApollo6, tNexus1, tNexus2, tNexus3, tNexus4, tNexus5, tCyber1, tCyber2, tCyber3, tCyber4];

    // Seed task creation events for all
    for (const t of allTasks) {
      await TaskTimeline.collection.insertOne({
        taskId: t._id,
        type: 'create',
        userId: elena._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: null,
        createdAt: new Date(now - 25 * day),
      });
    }

    // Seed specific field changes, status transitions and comments
    await TaskTimeline.collection.insertMany([
      // Apollo 1 (Audit HIPAA)
      {
        taskId: tApollo1._id,
        type: 'field_change',
        userId: bob._id,
        fieldName: 'status',
        oldValue: 'in_progress',
        newValue: 'in_review',
        commentText: null,
        createdAt: new Date(now - 6 * day),
      },
      {
        taskId: tApollo1._id,
        type: 'comment',
        userId: bob._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Redis session keys are now configured with AES-256 encryption. Token leak tests passed cleanly.',
        createdAt: new Date(now - 5.5 * day),
      },
      {
        taskId: tApollo1._id,
        type: 'field_change',
        userId: elena._id,
        fieldName: 'status',
        oldValue: 'in_review',
        newValue: 'done',
        commentText: null,
        createdAt: new Date(now - 5 * day),
      },

      // Apollo 2 (OAuth2 SSO)
      {
        taskId: tApollo2._id,
        type: 'field_change',
        userId: alice._id,
        fieldName: 'status',
        oldValue: 'backlog',
        newValue: 'in_progress',
        commentText: null,
        createdAt: new Date(now - 4 * day),
      },
      {
        taskId: tApollo2._id,
        type: 'comment',
        userId: elena._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Client requested advancing this milestone for the board demonstration. Alice and Bob will pair on the gateway callback.',
        createdAt: new Date(now - 3 * day),
      },
      {
        taskId: tApollo2._id,
        type: 'comment',
        userId: alice._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Okta staging realm provisioned. Testing JWT signature validation against our JWKS endpoint.',
        createdAt: new Date(now - 1 * day),
      },

      // Apollo 3 (Overdue FHIR)
      {
        taskId: tApollo3._id,
        type: 'field_change',
        userId: alice._id,
        fieldName: 'status',
        oldValue: 'backlog',
        newValue: 'in_progress',
        commentText: null,
        createdAt: new Date(now - 4 * day),
      },
      {
        taskId: tApollo3._id,
        type: 'comment',
        userId: alice._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Encountered OOM exception with Node stream backpressure. Refactoring buffer chunks to 64KB.',
        createdAt: new Date(now - 1.5 * day),
      },

      // Apollo 5 (Blocked WebRTC)
      {
        taskId: tApollo5._id,
        type: 'field_change',
        userId: bob._id,
        fieldName: 'status',
        oldValue: 'backlog',
        newValue: 'in_progress',
        commentText: null,
        createdAt: new Date(now - 4 * day),
      },
      {
        taskId: tApollo5._id,
        type: 'field_change',
        userId: bob._id,
        fieldName: 'status',
        oldValue: 'in_progress',
        newValue: 'blocked',
        commentText: null,
        createdAt: new Date(now - 2 * day),
      },
      {
        taskId: tApollo5._id,
        type: 'comment',
        userId: bob._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Blocked: Need Okta SSO token propagation ready to authorize WebRTC room join handshakes.',
        createdAt: new Date(now - 2 * day),
      },

      // Nexus 1 (KYC)
      {
        taskId: tNexus1._id,
        type: 'field_change',
        userId: alice._id,
        fieldName: 'status',
        oldValue: 'in_review',
        newValue: 'done',
        commentText: null,
        createdAt: new Date(now - 12 * day),
      },

      // Nexus 3 (Overdue iOS 18)
      {
        taskId: tNexus3._id,
        type: 'field_change',
        userId: david._id,
        fieldName: 'status',
        oldValue: 'backlog',
        newValue: 'in_progress',
        commentText: null,
        createdAt: new Date(now - 5 * day),
      },
      {
        taskId: tNexus3._id,
        type: 'comment',
        userId: david._id,
        fieldName: null,
        oldValue: null,
        newValue: null,
        commentText: 'Reproduced on iPhone 16 Pro simulator running iOS 18.1. Patching LocalAuthentication dispatch queue.',
        createdAt: new Date(now - 2 * day),
      },
    ]);

    // 6. SEED 8-WEEK COMPLETION HISTORY FOR DASHBOARD VELOCITY CHART
    console.log('\n--- Seeding 8-Week Completion History ---');
    const weeklyCompletions = [
      { weeksAgo: 1, count: 4 },
      { weeksAgo: 2, count: 5 },
      { weeksAgo: 3, count: 3 },
      { weeksAgo: 4, count: 6 },
      { weeksAgo: 5, count: 4 },
      { weeksAgo: 6, count: 5 },
      { weeksAgo: 7, count: 2 },
      { weeksAgo: 8, count: 3 },
    ];

    for (const item of weeklyCompletions) {
      const eventTime = new Date(now - (item.weeksAgo * 7 - 2) * day);
      for (let i = 0; i < item.count; i++) {
        // Create an archived historical completion event
        await TaskTimeline.collection.insertOne({
          taskId: tApollo1._id,
          type: 'field_change',
          userId: elena._id,
          fieldName: 'status',
          oldValue: 'in_review',
          newValue: 'done',
          commentText: null,
          createdAt: new Date(eventTime.getTime() + i * 3600000),
        });
      }
    }
    console.log('✔ Seeded 8-week completion history across past 8 weeks for dashboard analytics.');

    console.log('\n===============================================================');
    console.log('DEMO DATA GENERATION COMPLETE');
    console.log('===============================================================');
    console.log('DEMO ACCOUNTS READY FOR EVALUATION:');
    console.log('1. Manager:  manager@example.com / manager123  (Elena Rostova - Delivery Director)');
    console.log('2. Member 1: member1@example.com / member123  (Alice Walker - Full-Stack)');
    console.log('3. Member 2: member2@example.com / member123  (Bob Chen - Backend/Infra)');
    console.log('4. Member 3: member3@example.com / member123  (David Kim - Mobile/Frontend)');
    console.log('===============================================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('Fatal error during demo seed:', err);
    process.exit(1);
  }
};

runDemoSeed();
