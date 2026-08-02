//src/db/seed.ts
import { pool } from "./psql.js";
import argon2 from "argon2";

const DUMMY_PASSWORD = "password123";

const generateAvatar = (seed: string) =>
  `https://picsum.photos/seed/${seed}/200/200`;
const generateThumbnail = (seed: string) =>
  `https://picsum.photos/seed/${seed}/800/450`;
const generatePostImages = (seed: string) => [
  `https://picsum.photos/seed/${seed}_1/800/600`,
  `https://picsum.photos/seed/${seed}_2/800/600`,
  `https://picsum.photos/seed/${seed}_3/800/600`,
];

async function seed() {
  console.log("🌱 Starting massively expanded database seeding...");

  try {
    console.log("🔐 Hashing dummy passwords...");
    const hash = await argon2.hash(DUMMY_PASSWORD);

    console.log("🧹 Sweeping old data...");
    await pool.query("DELETE FROM posts;");
    await pool.query("DELETE FROM users;");

    console.log("👤 Creating 10 distinct users with unique avatars...");

    const userQueries: Array<[string, string, string]> = [
      ["superadmin", "Supreme Overlord", "super_admin"],
      ["admin_user", "System Administrator", "admin"],
      ["alice_bio", "Bio-Engineer Researcher", "user"],
      ["bob_coder", "Backend Developer", "user"],
      ["charlie_ai", "AI Machine Learning", "user"],
      ["diana_design", "UI/UX Specialist", "user"],
      ["eve_hacker", "Cybersecurity Analyst", "user"],
      ["frank_rnd", "R&D Director", "user"],
      ["grace_devops", "Infrastructure Guru", "user"],
      ["hank_hardware", "Robotics Engineer", "user"],
    ];

    const insertedUsers: { id: string; username: string }[] = [];
    for (const [username, profileTitle, role] of userQueries) {
      const result = await pool.query(
        `INSERT INTO users (username, profile_title, password_hash, role, avatar_url)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username;`,
        [username, profileTitle, hash, role, generateAvatar(username)],
      );
      insertedUsers.push(result.rows[0]!);
    }

    const getRandomUserId = () => {
      const randomIndex = Math.floor(Math.random() * insertedUsers.length);
      return insertedUsers[randomIndex]!.id;
    };

    console.log("📝 Preparing massive post data load...");

    const postData = [
      {
        title: "Living Muscle Robotics",
        shortDesc: "Exploring muscle-powered robotic systems.",
        content:
          "Bio-engineering opens new ways to build efficient machines. Living muscle could replace traditional mechanical actuators in future robots, providing a level of elasticity that synthetic motors just cannot replicate efficiently.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["robotics", "biology"],
      },
      {
        title: "Artificial Tendons using Kevlar",
        shortDesc: "Designing stronger flexible connectors for prosthetics.",
        content:
          "Artificial tendons can improve robotic movement and durability. Their flexibility allows smoother and more natural motion. We are currently testing Kevlar-weaved bioplastics to mimic the tensile strength of human ligaments under extreme load.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["materials", "robotics"],
      },
      {
        title: "Scaling Lab-Grown Biological Tissues",
        shortDesc:
          "The future of engineered lab-grown tissues and vascularization.",
        content:
          "Lab-grown tissues continue to advance modern bio-engineering. These technologies may support robotics and medical innovation alike. Scaling production outside of petri dishes remains our biggest current bottleneck, primarily due to the lack of synthetic vascular networks to deliver nutrients deep into the tissue mass.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["tissue", "research"],
      },
      {
        title: "Neural Interfaces: Reading the Motor Cortex",
        shortDesc: "Connecting organic tissue to hardware through BCI.",
        content:
          "Reading scientific papers sparks new project ideas. Connecting different fields often leads to innovation. Today's deep dive was into non-invasive neural interfaces reading motor cortex signals through the scalp. The signal-to-noise ratio is terrible, but advanced machine learning filters are making it viable.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["neural", "bci"],
      },
      {
        title: "CRISPR-Cas9 in Agricultural Yields",
        shortDesc: "Modifying crop genomes for drought resistance.",
        content:
          "Gene editing tools like CRISPR are revolutionizing how we approach food security. By targeting specific alleles responsible for water retention, we can engineer crops that survive in arid climates without sacrificing nutritional value. The ethical debates continue, but the science is undeniable.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["genetics", "crispr", "agriculture"],
      },
      {
        title: "Biomimicry in Drone Design",
        shortDesc: "How owl feathers are inspiring silent drone propellers.",
        content:
          "Owls are silent hunters, thanks to the micro-fringes on the trailing edges of their feathers that break up aerodynamic turbulence. Applying these exact micro-structures to quadcopter blades has reduced acoustic signatures by over 60% in our latest wind tunnel tests.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["biomimicry", "drones", "aerodynamics"],
      },
      {
        title: "Synthetic Blood Substitutes",
        shortDesc: "Developing oxygen-carrying perfluorocarbon emulsions.",
        content:
          "The chronic shortage of donor blood has accelerated research into artificial oxygen carriers. Perfluorocarbons (PFCs) can dissolve immense amounts of oxygen, but formulating them into stable emulsions that the human immune system won't immediately reject is a monumental biochemical challenge.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["medicine", "chemistry"],
      },
      {
        title: "Mycelium as Building Materials",
        shortDesc: "Growing structures instead of pouring concrete.",
        content:
          "Fungi root networks (mycelium) can be directed to grow around organic waste, forming bricks that are stronger than concrete, fire-resistant, and entirely biodegradable. We are building a small pavilion entirely out of mushroom bricks to test structural integrity over a 12-month weathering period.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["mycelium", "sustainability"],
      },
      {
        title: "Optogenetics: Controlling Cells with Light",
        shortDesc: "Using light to activate specific neural pathways.",
        content:
          "By genetically modifying neurons to express light-sensitive ion channels, we can turn specific brain circuits on and off with laser precision. This is currently revolutionizing our understanding of memory formation in mice, and holds distant promise for treating neurodegenerative diseases.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["neuroscience", "optogenetics"],
      },
      {
        title: "Bacterial Data Storage",
        shortDesc: "Encoding binary data into living DNA.",
        content:
          "DNA is the most dense data storage medium in the universe. We successfully encoded a 5MB image into the genome of E. coli bacteria. The data persists across generations of bacterial division, though mutation rates require heavy error-correction algorithms (like Reed-Solomon) to ensure data integrity upon retrieval.",
        category: "bio-engineering",
        sub: null,
        github: null,
        tags: ["dna", "storage", "synthetic-biology"],
      },

      {
        title: "The Power of Consistency",
        shortDesc:
          "Small daily coding habits drastically improve programming skills.",
        content:
          "Writing code every day builds confidence and experience. Consistency matters more than occasional bursts of motivation. Setting aside just 45 uninterrupted minutes every morning has transformed my output. The key is to never break the chain, even if you just write tests or refactor a single function.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["productivity", "habits"],
      },
      {
        title: "Big O Notation in the Real World",
        shortDesc: "Why deep algorithmic knowledge actually matters.",
        content:
          "Efficient algorithms solve problems faster and with fewer resources. Learning them makes every developer stronger. Don't rely on brute force when a simple hash map or binary search can reduce time complexity drastically. A O(N^2) algorithm might pass unit tests, but it will melt your servers in production.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["algorithms", "dsa"],
      },
      {
        title: "Monoliths vs Microservices",
        shortDesc: "Thinking beyond individual programs to system design.",
        content:
          "Scalable systems require careful planning from the beginning. Architecture decisions influence long-term success. It is significantly harder to break a tightly-coupled monolith into microservices than it is to establish clear domain boundaries on day one. Always design for modularity.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["architecture", "design"],
      },
      {
        title: "Demystifying the Garbage Collector",
        shortDesc: "Making applications more memory efficient.",
        content:
          "Good memory usage improves speed and reliability. Understanding allocation helps prevent unnecessary bugs. Garbage collection in higher-level languages (like V8 in Node.js) often masks underlying memory leaks until production systems crash with Out Of Memory (OOM) errors. Profile your heap allocations!",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["memory", "performance"],
      },
      {
        title: "Inside the Linux Kernel",
        shortDesc: "Learning how computers actually schedule processes.",
        content:
          "Operating systems coordinate hardware and software efficiently. Studying them improves every programmer's foundation. Understanding process scheduling, thread concurrency, and deadlocks translates directly to writing better concurrent web servers and distributed systems.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["os", "linux"],
      },
      {
        title: "Building an Abstract Syntax Tree",
        shortDesc: "Understanding how text becomes executable software.",
        content:
          "Compilers transform human-readable code into machine instructions. Learning their internals improves programming intuition. Generating Abstract Syntax Trees (ASTs) is a beautiful mix of linguistics and logic. Writing a simple Lisp interpreter in TypeScript was the best CS exercise I did this year.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["compilers", "ast"],
      },
      {
        title: "Zero-Knowledge Proofs (ZKPs)",
        shortDesc: "The future of privacy-preserving cryptography.",
        content:
          "Zero-knowledge proofs allow one party to prove to another that a statement is true, without revealing any information beyond the validity of the statement itself. The math behind zk-SNARKs is dense, but the applications for decentralized identity and secure voting systems are limitless.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["cryptography", "math"],
      },
      {
        title: "The CAP Theorem Explained",
        shortDesc: "Consistency, Availability, Partition Tolerance.",
        content:
          "In distributed computing, the CAP theorem states that a distributed data store can only provide two of the following three guarantees simultaneously: Consistency, Availability, and Partition tolerance. Understanding these trade-offs is fundamental when choosing between PostgreSQL, MongoDB, or Cassandra.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["distributed-systems", "databases"],
      },
      {
        title: "WebAssembly (Wasm) is Changing the Web",
        shortDesc: "Running compiled C/C++ and Rust directly in the browser.",
        content:
          "WebAssembly is allowing developers to bring legacy C++ codebases (like video editors and physics engines) directly into the browser running at near-native speeds. It bypasses the JavaScript VM entirely. I foresee a future where JS is just glue code for heavy Wasm modules.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["wasm", "web"],
      },
      {
        title: "Vector Databases for AI",
        shortDesc: "How LLMs retrieve contextual information.",
        content:
          "With the rise of Large Language Models, traditional relational databases aren't enough for semantic search. Vector databases store data as high-dimensional embeddings. When you query them, they use cosine similarity to find conceptually related information, powering the RAG (Retrieval-Augmented Generation) pipelines we use today.",
        category: "computer-science",
        sub: null,
        github: null,
        tags: ["ai", "databases", "vectors"],
      },

      {
        title: "Building My Personal Portfolio",
        shortDesc: "Creating scalable personal projects that matter.",
        content:
          "Each completed project teaches valuable lessons. Shipping real software is better than endless planning. This portfolio was built using Express, PostgreSQL, and deployed automatically via GitHub actions. It serves as my digital resume and sandbox for new web technologies.",
        category: "projects",
        sub: "serious",
        github: "https://github.com/rotten-lab/portfolio",
        tags: ["web", "showcase"],
      },
      {
        title: "Nuclear AI Vulnerability Scanner",
        shortDesc:
          "Sharing code analysis tools with the open-source community.",
        content:
          "Publishing projects encourages collaboration and feedback. Open-source communities accelerate learning. Our AI-based vulnerability scanner successfully identified 3 critical CVEs on its first real-world test run. It uses Gemini Flash to scan AST trees for classic injection vectors.",
        category: "projects",
        sub: "serious",
        github: "https://github.com/rotten-lab/nuclear-scanner",
        tags: ["security", "ai"],
      },
      {
        title: "Core API Authentication Service",
        shortDesc:
          "Creating reliable, scalable, and secure backend microservices.",
        content:
          "Well-designed APIs simplify communication between applications. Documentation is just as important as implementation. We implemented rate limiting and robust JWT rotation (with refresh tokens stored securely in Redis) from scratch for maximum security against token theft.",
        category: "projects",
        sub: "serious",
        github: "https://github.com/rotten-lab/core-api",
        tags: ["backend", "api", "security"],
      },
      {
        title: "Rust-Based Quantum Key Simulator",
        shortDesc: "Simulating the BB84 protocol for secure key exchange.",
        content:
          "Cryptography has always fascinated me, especially post-quantum techniques. In this project, I explore QKD (Quantum Key Distribution) by simulating photon polarization states. The core logic is built in Rust for memory safety, bridging to a Node backend for WebSocket communication.",
        category: "projects",
        sub: "serious",
        github: "https://github.com/rotten-lab/qkd-rust",
        tags: ["rust", "crypto"],
      },
      {
        title: "Company Landing Page Rebuild",
        shortDesc: "Designing a clean, highly performant online web presence.",
        content:
          "A simple website communicates ideas more effectively. Every page should focus on clarity and performance. We stripped out 40% of the old JavaScript payload, migrated to a lightweight CSS module system, and achieved a perfect 100 on Google Lighthouse.",
        category: "projects",
        sub: "serious",
        github: "https://github.com/rotten-lab/company-site",
        tags: ["frontend", "performance"],
      },
      {
        title: "Cat Fact Generator Extravaganza",
        shortDesc: "Looking back at early API usage and fun side projects.",
        content:
          "Early versions reveal how much a project has evolved. Every iteration brings better ideas and stronger engineering. Pulling 10,000 cat images via a public API taught me a lot about network retry logic, exponential backoff, and how to handle unpredictable JSON schemas without crashing.",
        category: "projects",
        sub: "random",
        github: null,
        tags: ["api", "fun", "learning"],
      },
      {
        title: "3D Printed Robotic Chassis",
        shortDesc: "Starting the first prototype build for a hexapod robot.",
        content:
          "Every hardware prototype uncovers new engineering challenges. Small experiments eventually become real products. The chassis is currently 3D printed out of standard PLA filament, but the joints are too brittle. I will transition to carbon-fiber-infused nylon next month to handle the torque of the servos.",
        category: "projects",
        sub: "random",
        github: null,
        tags: ["hardware", "3d-printing"],
      },
      {
        title: "Terminal-Based Tetris Clone",
        shortDesc: "Rebuilding a classic game using ANSI escape codes.",
        content:
          "Sometimes you just need to build something fun. I wrote a fully functional Tetris clone that runs entirely in the standard Bash terminal. It uses raw ANSI escape codes to paint the blocks and handle keyboard interrupts. Managing the game loop tick rate without eating 100% CPU was a fun puzzle.",
        category: "projects",
        sub: "random",
        github: null,
        tags: ["cli", "gaming", "c"],
      },
      {
        title: "Automated Coffee Machine Hacker",
        shortDesc: "Wiring an ESP8266 to my dumb coffee maker.",
        content:
          "I reverse-engineered the logic board of a cheap $20 coffee maker and soldered a Wi-Fi enabled ESP8266 microcontroller to the brew switch. Now, a cron job on my Raspberry Pi pings the coffee maker at exactly 7:00 AM. Best hardware hack I've done all year.",
        category: "projects",
        sub: "random",
        github: null,
        tags: ["iot", "hardware", "coffee"],
      },
      {
        title: "Markov Chain Poetry Bot",
        shortDesc: "Generating terrible poetry using basic statistics.",
        content:
          "Before LLMs took over the world, we had Markov chains. I fed a dataset of 50,000 classic poems into a simple Python script that maps word transition probabilities. The output is usually nonsensical garbage, but occasionally it spits out a line so profoundly beautiful it gives me chills.",
        category: "projects",
        sub: "random",
        github: null,
        tags: ["python", "nlp", "fun"],
      },

      {
        title: "The Joy of Deleting Code",
        shortDesc: "Why removing lines of code is better than adding them.",
        content:
          "Today I spent 6 hours refactoring a monolithic auth service and managed to delete over 800 lines of legacy code. The system is now faster, easier to read, and has full test coverage. PRs that have negative line counts are genuinely my favorite type of contribution.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["refactoring", "wins"],
      },
      {
        title: "Learning from a Production Outage",
        shortDesc: "Mistakes become valuable experience when documented.",
        content:
          "Every failed experiment teaches something valuable. Documenting failures prevents repeating the same mistakes. I accidentally dropped a critical production table today because of a rogue migration script. Thankfully, our point-in-time recovery strategy worked flawlessly. I've now added dry-run guardrails to the CI pipeline.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["lessons", "fail", "devops"],
      },
      {
        title: "Late Night Coding Sessions",
        shortDesc: "Quiet hours bring deep work and intense focus.",
        content:
          "Working late helped me solve a difficult programming problem that I've been stuck on for days. Fresh ideas often appear after persistent, uninterrupted effort. The silence of the house allows me to hold complex architectural diagrams in my head without the constant ping of Slack messages.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["focus", "night"],
      },
      {
        title: "Balancing Ambition and Burnout",
        shortDesc: "Learning when to close the laptop and walk away.",
        content:
          "Tech culture glorifies the hustle, but human brains need rest to process complex logic. I found myself staring at the same bug for 3 hours yesterday. I went for a 20-minute walk, didn't think about code at all, and realized the solution the moment I sat back down. Rest is productive.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["mental-health", "career"],
      },
      {
        title: "Why I Switched Back to PostgreSQL",
        shortDesc: "My brief, chaotic romance with NoSQL databases.",
        content:
          "Two years ago, I thought everything needed to be a NoSQL document. Today, I am moving my main projects back to good old relational PostgreSQL. The reality is that 95% of data is relational, and trying to force complex joins into application-level code was a disaster. ACID compliance is beautiful.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["databases", "reflections"],
      },
      {
        title: "The Imposter Syndrome Never Truly Fades",
        shortDesc: "Thoughts on navigating senior engineering roles.",
        content:
          "Even after a decade of writing software, there are days I feel like I have no idea what I'm doing. Technology moves so fast. The secret I've learned from other senior devs is that nobody knows everything; seniority is just the confidence that you can figure it out eventually by reading the docs.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["career", "mindset"],
      },
      {
        title: "My 100-Day Commit Streak",
        shortDesc: "Progress achieved strictly through discipline.",
        content:
          "Consistency beats motivation in every ambitious project. Small daily improvements create meaningful results over time. I've maintained a 100-day commit streak without burning out simply by setting realistic micro-goals and enforcing a hard stop at 6 PM. It's a marathon, not a sprint.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["discipline", "goals"],
      },
      {
        title: "Future Vision: Bio-Computational Hybrids",
        shortDesc: "Thinking about long-term technological convergence.",
        content:
          "Building durable technology remains my biggest motivation. Long-term thinking shapes better daily decisions. I want to shift my career focus entirely toward the intersection of biology and computer science over the next five years. The integration of silicon and carbon is the next great frontier.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["planning", "vision"],
      },
      {
        title: "The Art of Writing Good Documentation",
        shortDesc: "Code tells you how, comments tell you why.",
        content:
          "I used to hate writing docs. Now, I consider it the most important part of my job. You aren't writing code for the compiler; you are writing it for the developer who has to maintain it six months from now—which is usually yourself. Good READMEs save lives.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["writing", "soft-skills"],
      },
      {
        title: "Attending My First Hackathon",
        shortDesc: "Sleep deprivation, pizza, and prototype deployment.",
        content:
          "I spent the weekend at a 48-hour local hackathon. We built a terrible, buggy, barely functional app, but the energy in the room was incredible. Being surrounded by hundreds of people building things purely for the joy of creation reminded me why I got into this industry in the first place.",
        category: "diary",
        sub: null,
        github: null,
        tags: ["community", "hackathon"],
      },
    ];

    console.log(`🚀 Inserting ${postData.length} posts into the database...`);

    for (const [i, data] of postData.entries()) {
      const postSeed = `post_${i}`;

      await pool.query(
        `INSERT INTO posts (
          author_id, category, subcategory, thumbnail, post_images, 
          title, short_description, main_content, tags, github_link
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          getRandomUserId(),
          data.category,
          data.sub,
          generateThumbnail(postSeed),
          generatePostImages(postSeed),
          data.title,
          data.shortDesc,
          data.content,
          data.tags,
          data.github,
        ],
      );
    }

    console.log("✅ Database seeded successfully with massive data payload!");
    console.log(
      "🔑 You can now log in to ANY of the 10 accounts using password: password123",
    );
    console.log(
      "   Example Accounts: superadmin, admin_user, alice_bio, eve_hacker",
    );
  } catch (error) {
    console.error("❌ Error during seeding:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
