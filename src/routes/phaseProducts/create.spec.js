/* eslint-disable no-unused-expressions */
import _ from 'lodash';
import chai from 'chai';
import request from 'supertest';
import server from '../../app';
import models from '../../models';
import testUtil from '../../tests/util';

const should = chai.should();

const body = {
  name: 'test phase product',
  type: 'product1',
  estimatedPrice: 20.0,
  actualPrice: 1.23456,
  details: {
    message: 'This can be any json',
  },
};

describe('Phase Products', () => {
  let projectId;
  let phaseId;
  const memberUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.member).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.member).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  const copilotUser = {
    handle: testUtil.getDecodedToken(testUtil.jwts.copilot).handle,
    userId: testUtil.getDecodedToken(testUtil.jwts.copilot).userId,
    firstName: 'fname',
    lastName: 'lName',
    email: 'some@abc.com',
  };
  before((done) => {
    // mocks
    testUtil.clearDb()
        .then(() => {
          models.Project.create({
            type: 'generic',
            billingAccountId: 1,
            name: 'test1',
            description: 'test project1',
            status: 'draft',
            details: {},
            createdBy: 1,
            updatedBy: 1,
          }).then((p) => {
            projectId = p.id;
            // create members
            models.ProjectMember.bulkCreate([{
              id: 1,
              userId: copilotUser.userId,
              projectId,
              role: 'copilot',
              isPrimary: false,
              createdBy: 1,
              updatedBy: 1,
            }, {
              id: 2,
              userId: memberUser.userId,
              projectId,
              role: 'customer',
              isPrimary: true,
              createdBy: 1,
              updatedBy: 1,
            }]).then(() => {
              models.ProjectPhase.create({
                name: 'test project phase',
                status: 'active',
                startDate: '2018-05-15T00:00:00Z',
                endDate: '2018-05-15T12:00:00Z',
                budget: 20.0,
                progress: 1.23456,
                details: {
                  message: 'This can be any json',
                },
                createdBy: 1,
                updatedBy: 1,
                projectId,
              }).then((phase) => {
                phaseId = phase.id;
                done();
              });
            });
          });
        });
  });

  after((done) => {
    testUtil.clearDb(done);
  });

  describe('POST /projects/{projectId}/phases/{phaseId}/products', () => {
    it('should return 403 if user does not have permissions (non team member)', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member2}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 403 if user does not have permissions (customer)', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.member}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(403, done);
    });

    it('should return 422 when name not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.name;
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when type not provided', (done) => {
      const reqBody = _.cloneDeep(body);
      delete reqBody.type;
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when estimatedPrice is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.estimatedPrice = -20;
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 422 when actualPrice is negative', (done) => {
      const reqBody = _.cloneDeep(body);
      reqBody.actualPrice = -20;
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: reqBody })
        .expect('Content-Type', /json/)
        .expect(422, done);
    });

    it('should return 404 when project is not found', (done) => {
      request(server)
        .post(`/v4/projects/99999/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 404 when project phase is not found', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/99999/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.manager}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(404, done);
    });

    it('should return 201 if payload is valid', (done) => {
      request(server)
        .post(`/v4/projects/${projectId}/phases/${phaseId}/products`)
        .set({
          Authorization: `Bearer ${testUtil.jwts.copilot}`,
        })
        .send({ param: body })
        .expect('Content-Type', /json/)
        .expect(201)
        .end((err, res) => {
          if (err) {
            done(err);
          } else {
            const resJson = res.body.result.content;
            should.exist(resJson);
            resJson.name.should.be.eql(body.name);
            resJson.type.should.be.eql(body.type);
            resJson.estimatedPrice.should.be.eql(body.estimatedPrice);
            resJson.actualPrice.should.be.eql(body.actualPrice);
            resJson.details.should.be.eql(body.details);
            done();
          }
        });
    });
  });
});
