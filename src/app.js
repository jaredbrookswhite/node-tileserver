import koa from 'koa';
import route from 'koa-route';

const app = koa();
const port = process.env.PORT || 5000;

function *index() {
  this.body = 'Hello Universe';
}

app.use(route.get('/', index));

app.listen(port);
