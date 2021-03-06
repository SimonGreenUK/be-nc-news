const connection = require('../db/connection');
const { fetchUserByUsername } = require('./users-mod');
const { fetchTopicBySlug } = require('./topics-mod');

exports.fetchAllArticles = ({
  sort_by = 'created_at',
  order = 'desc',
  author,
  topic
}) => {
  const validOrder = ['asc', 'desc'];
  if (!validOrder.includes(order)) {
    return Promise.reject({ status: 400, msg: 'bad request' });
  }

  const fetchArticles = connection
    .select(
      'articles.author',
      'articles.title',
      'articles.article_id',
      'articles.topic',
      'articles.created_at',
      'articles.votes'
    )
    .orderBy(sort_by, order)
    .count({ comment_count: 'comment_id' })
    .from('articles')
    .leftJoin('comments', 'comments.article_id', 'articles.article_id')
    .groupBy('articles.article_id')
    .modify(query => {
      if (author) query.where('articles.author', '=', author);
      if (topic) query.where('articles.topic', '=', topic);
    });

  const promiseArray = [fetchArticles];

  if (author) promiseArray.push(fetchUserByUsername({ username: author }));
  if (topic) promiseArray.push(fetchTopicBySlug(topic));

  return Promise.all(promiseArray);
};

exports.fetchArticleByArticleId = ({ article_id }) => {
  return connection
    .select('articles.*')
    .count({ comment_count: 'comment_id' })
    .from('articles')
    .leftJoin('comments', 'comments.article_id', 'articles.article_id')
    .groupBy('articles.article_id')
    .where('articles.article_id', '=', article_id)
    .then(([article]) => {
      return article
        ? article
        : Promise.reject({ status: 404, msg: 'article not found' });
    });
};

exports.changeArticleVotesByArticleId = ({ article_id }, { inc_votes = 0 }) => {
  return connection('articles')
    .where('articles.article_id', '=', article_id)
    .increment('votes', inc_votes)
    .returning('*')
    .then(([article]) => {
      return article
        ? article
        : Promise.reject({ status: 404, msg: 'article not found' });
    });
};
