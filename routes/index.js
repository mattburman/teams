const express = require('express');
const router = express.Router();
const axios = require('axios');
const YAML = require('yamljs');
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
if (!GITHUB_TOKEN) throw new Error("Supply GitHub token");

const getpeople = `{
  repository(owner:"mattburman", name:"hackmed-people") {
    object(expression:"master:people.yml") {
      ... on Blob {
      	text
      }
    }
  }
}`;

const getdetails = `{
  search(first:100, type:USER, query:"{{USERS}}"){
    nodes{
      ...on User {
        name
        login
        avatarUrl
        websiteUrl
      }
    }
  }
}`;

const headers = { 'Authorization': `Bearer ${GITHUB_TOKEN}` };

/* GET home page. */
router.get('/', (req, res, next) => {
  axios.post('https://api.github.com/graphql', { query: getpeople }, { headers })
    .then((graphqlRes) => {
      console.log(graphqlRes.data);
      const people = {};
      YAML.parse(graphqlRes.data.data.repository.object.text).forEach(person => {
        people[person.github] = person;
      });

      const userQueryString = Object.keys(people)
        .reduce((q, githubLogin) => `${q} user:${githubLogin}`, '');

      console.log(userQueryString);

      console.log(getdetails.replace('{{USERS}}', userQueryString));
      axios.post('https://api.github.com/graphql', { query: getdetails.replace('{{USERS}}', userQueryString) }, { headers })
        .then((graphqlRes) => {
          graphqlRes.data.data.search.nodes.forEach(person => {
            Object.keys(person).forEach(key => {
              people[person.login][key] = person[key];
              people[person.login].thing = 'test';
            });
          });
          console.log(people);
          res.render('index', { title: 'Teams', people });
      }).catch(err => {
        console.error(err);
        res.render('error', {});
      });

      // const people = graphqlRes.data.data.organization.teams.edges.map(edge => edge.node)[0].members.edges.map(edge => edge.node);
      // res.render('index', { title: 'Teams', people });
    })
    .catch((err) => {
      console.log(err);
      res.render('error', {});
  });
});

module.exports = { router };
