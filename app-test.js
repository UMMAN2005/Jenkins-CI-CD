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

    it("it should handle invalid planet ID gracefully", (done) => {
      let payload = { id: 99 };
      chai
        .request(server)
        .post("/planets")
        .send(payload)
        .end((err, res) => {
          res.should.have.status(404);
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
          res.should.have.status(404);
          done();
        });
    });
  });
});

describe("Testing Other Endpoints", () => {
  describe("it checks index endpoint", () => {
    it("it should fetch the index page", (done) => {
      chai
        .request(server)
        .get("/")
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });
  });

  describe("it should fetch OS Details", () => {
    it("it should fetch OS details", (done) => {
      chai
        .request(server)
        .get("/os")
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.have.property("os");
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
  });

  describe("Testing API Docs Endpoint", () => {
    it("it should fetch the API documentation", (done) => {
      chai
        .request(server)
        .get("/api-docs")
        .end((err, res) => {
          res.should.have.status(200);
          done();
        });
    });
  });
});
