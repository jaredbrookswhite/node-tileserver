import koa from 'koa';
import route from 'koa-route';

const app = koa();
const port = 3000;

function *index() {
  this.body = 'Hello World';
}

app.use(route.get('/', index));

app.listen(port);
