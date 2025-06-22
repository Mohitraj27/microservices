<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Node.js_logo.svg" width="100" />
  <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/RabbitMQ_logo.svg" width="100" />
  <img src="https://avatars.githubusercontent.com/u/6764390?s=48&v=4" width="50"/>
  <span style="font-size:16px; margin-left:8px;"><strong>Elasticsearch</strong></span>
</p>


## ❓ Problem Statement
In traditional ride-booking platforms, scaling and maintaining tightly coupled services leads to bottlenecks in performance, code complexity, and deployment delays. There’s a need for:

- A scalable and decoupled system to handle user and captain management, ride lifecycle, and real-time updates.

- Secure authentication and password management for both users and captains.

- Efficient communication between services to keep the system responsive.

- Real-time ride status tracking and notification updates.

- Fast search and filtering across users, captains, and rides.


## ✅ Solution
I designed and implemented a microservices-based ride-hailing backend system using Node.js, MongoDB, RabbitMQ, and Elasticsearch. Each service is independently deployable, and they communicate asynchronously for optimal scalability.

## 🧩 Microservices Breakdown
`User Service` : Handles user registration, login, profile, ride history, password operations.

`Captain Service`: Handles captain registration, login, profile, ride participation, password operations.

`Ride Service` : Manages ride creation, state transitions (REQUESTED, ACCEPTED, STARTED, COMPLETED), and stores notifications.

` API Gateway`: This manages all the three services using expressProxy

## 🔄 Business Logic Flow
- Registration/Login for Users and Captains with password validation.

- Authenticated Users create rides → Ride requests are broadcasted to all Captains.

- Captains accept/reject rides.

- Ride progresses through states, and status updates are sent to both parties.

- Notifications are stored in DB for all ride events (accept/reject/start/complete).

- Users and Captains can fetch profile + ride history using RPC via RabbitMQ.

- Users and Captain can change their existing password and can also reset their password.

- All communication between services is through RabbitMQ queues.

- Elasticsearch is used which boosts search/query performance using indexes (user, captain, ride).

## <img src="https://upload.wikimedia.org/wikipedia/commons/7/71/RabbitMQ_logo.svg" width="100" /> Communication Patterns

### ✅ Remote Procedure Call (Request-Reply)

In **microservices architecture**, it simply means **calling a function that lives in another service** (like `captain-service`) as if it were a local function — but under the hood, it sends a message over a queue (like RabbitMQ) and waits for a response.


### 🧠 Simple Analogy:

Imagine you're in one room (User Service), and you shout to the next room (Captain Service):

> “Hey Captain Service, give me captain details for ID abc123.”
> 

Captain Service replies:

> “Sure! Here's the captain info: {_id, name, email}.”
> 

That’s **RPC** — a **request-response** pattern between services using a message broker like **RabbitMQ**.

So here RPC is Used for: Fetching ride history (e.g. get-user-rides, get-captain-rides) and Getting current ride status.
Flow:
` Client → User Service → RabbitMQ Queue → Ride Service → Reply Queue → User Service → Client`
### ✅ Event-Driven (Async Messaging)

Used for: Sending ride status updates and Creating notifications


## Run the services in the following order to avoid dependency issues:

- Terminal 1: Start Gateway First

  `cd gateway`

  `npx nodemon`

Expected Output:

  
  `[nodemon] starting node server.js`
  
  `Gateway server listening on port 3000`
  

- Terminal 2: Start User Service
 
  `cd user-service`
  
  `npx nodemon`

Expected Output:

`[nodemon] starting node server.js`

`User service connected to MongoDB`

`User service connected to RabbitMQ`

`user service connected to ElasticSearch`

`User service is running on port 3001`


- Terminal 3: Start Captain Service

 `cd captain-service`
  
  `npx nodemon`

Expected Output:

`[nodemon] starting node server.js`

`Captain service connected to MongoDB`

`Captain service connected to RabbitMQ`

`captain service connected to Elastic Search`

`Captain service is running on port 3002`


- Terminal 4: Start Ride Service
 
  `cd ride-service`
  
  `npx nodemon`

Expected Output:

  `[nodemon] starting node server.js`
  
  `Ride service connected to MongoDB`
  
  `Ride service connected to RabbitMQ`
  
  `Ride service connected to Elastic Search`
  
  `Ride service is running on port 3003`

## API Endpoints

`https://documenter.getpostman.com/view/25420804/2sB2xBEqPs`
