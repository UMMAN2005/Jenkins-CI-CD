const server = require("./app");
const chai = require("chai");
const chaiHttp = require("chai-http");

// Assertion
chai.should();
chai.use(chaiHttp);

describe("Planets API Suite", () => {
  describe("Fetching Planet Details", () => {
    it("it should fetch a planet named Mercury", (done) => {
      let payload = { id: 1 };
      chai
        .request(server)
        .post("/planets")
        .send(payload)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("id").eql(1);
          res.body.should.have.property("name").eql("Mercury");
          done();
        });
    });

    it("it should fetch a planet named Venus", (done) => {
      let payload = { id: 2 };
      chai
        .request(server)
        .post("/planets")
        .send(payload)
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("id").eql(2);
          res.body.should.have.property("name").eql("Venus");
          done();
        });
    });

    // Repeat similar tests for the remaining planets...

    it("it should handle invalid planet ID gracefully", (done) => {
      let payload = { id: 99 };
      chai
        .request(server)
        .post("/planets")
        .send(payload)
        .end((err, res) => {
          res.should.have.status(400); // Or another appropriate error code for invalid data
          res.body.should.have.property("message").eql("Planet not found");
          done();
        });
    });

    it("it should handle missing planet ID", (done) => {
      let payload = {};
      chai
        .request(server)
        .post("/planets")
        .send(payload)
        .end((err, res) => {
          res.should.have.status(400); // Or another appropriate error code for missing data
          res.body.should.have.property("message").eql("ID is required");
          done();
        });
    });
  });
});

describe("Testing Other Endpoints", () => {
  describe("it should fetch OS Details", () => {
    it("it should fetch OS details", (done) => {
      chai
        .request(server)
        .get("/os")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("os");
          res.body.should.have.property("env");
          done();
        });
    });
  });

  describe("it should fetch Live Status", () => {
    it("it checks Liveness endpoint", (done) => {
      chai
        .request(server)
        .get("/live")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("status").eql("live");
          done();
        });
    });

    it("it should handle liveness failure gracefully", (done) => {
      // Simulate a failure in live status (for testing purpose only)
      // You might want to mock or simulate an unresponsive server here
      chai
        .request(server)
        .get("/live")
        .end((err, res) => {
          res.should.have.status(503); // Service Unavailable, for instance
          res.body.should.have.property("status").eql("unavailable");
          done();
        });
    });
  });

  describe("it should fetch Ready Status", () => {
    it("it checks Readiness endpoint", (done) => {
      chai
        .request(server)
        .get("/ready")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("status").eql("ready");
          done();
        });
    });

    it("it should handle readiness failure gracefully", (done) => {
      // Simulate a failure in readiness status (for testing purpose only)
      // Mock or simulate server unavailability or readiness failure
      chai
        .request(server)
        .get("/ready")
        .end((err, res) => {
          res.should.have.status(503); // Service Unavailable, for instance
          res.body.should.have.property("status").eql("not ready");
          done();
        });
    });
  });

  describe("Testing API Docs Endpoint", () => {
    it("it should fetch the API documentation", (done) => {
      chai
        .request(server)
        .get("/apidocs") // Adjust to the actual endpoint
        .end((err, res) => {
          res.should.have.status(200); // Assuming it's a success response
          res.should.have.property("content-type").eql("application/json"); // Adjust if the format is different
          res.body.should.have.property("swagger"); // Assuming the response contains a Swagger definition
          done();
        });
    });

    it("it should handle 404 for nonexistent API docs", (done) => {
      chai
        .request(server)
        .get("/nonexistent-apidocs") // Testing for a wrong API docs path
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.have.property("message").eql("Not Found");
          done();
        });
    });
  });
});
