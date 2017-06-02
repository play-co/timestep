import Point from './Point';
import Line from './Line';
import Rect from './Rect';
import Circle from './Circle';

/**
 * @package math.geom.intersect
 */

export const pointAndRect = function (pt: Point, rect: Rect): boolean {
  var x = pt.x, y = pt.y;
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
};

export const rectAndPoint = function (rect: Rect, pt: Point): boolean {
  return pointAndRect(pt, rect);
};

export const pointAndCircle = function (pt: Point, circle: Circle): boolean {
  var dx = pt.x - circle.x, dy = pt.y - circle.y;
  return dx * dx + dy * dy < circle.radius * circle.radius;
};

export const circleAndPoint = function (circle: Circle, pt: Point): boolean {
  return pointAndCircle(pt, circle);
};

export const circleAndCircle = function (circle1: Circle, circle2: Circle): boolean {
  var dx = circle2.x - circle1.x, dy = circle2.y - circle1.y;
  var radiusSum = circle1.radius + circle2.radius;
  return dx * dx + dy * dy <= radiusSum * radiusSum;
};

export const isRectAndRect = function (rect1: Rect, rect2: Rect): boolean {
  return !(rect1.y + rect1.height < rect2.y || rect2.y + rect2.height < rect1.y || rect1.x + rect1.width < rect2.x || rect2.x + rect2.width < rect1.x);
};

export const circleAndRect = function (circle: Circle, rect: Rect): boolean {
  if (pointAndRect(circle, rect)) {
    return true;
  }
  return lineAndCircle(rect.getSide(1), circle) || lineAndCircle(rect.getSide(2), circle) || lineAndCircle(rect.getSide(3), circle) || lineAndCircle(rect.getSide(4), circle);
};

export const rectAndCircle = function (rect: Rect, circle: Circle): boolean {
  return circleAndRect(circle, rect);
};

export const lineAndCircle = function (line: Line, circle: Circle): boolean {
  var vec = pointToLine(circle, line);
  return vec.getMagnitude() < circle.radius;
};

export const circleAndLine = function (circle: Circle, line: Line): boolean {
  return lineAndCircle(line, circle);
};

// returns line from pt to nearest pt on line
export const pointToLine = function (pt: Point, line: Line): Line {
  var dx = line.end.x - line.start.x, dy = line.end.y - line.start.y, u = ((pt.x - line.start.x) * dx + // TODO can we abstract this from 2D to 2D/3D?
    (pt.y - line.start.y) * dy) / (dx * dx + dy * dy);

  var i;
  if (u < 0) {
    i = new Point(line.start);
  } else if (u > 1) {
    i = new Point(line.end);
  } else {
    i = new Point(line.start.x + u * dx, line.start.y + u * dy);
  }
  return new Line(i, pt);
};

// returns rectangle of intersection
export const rectAndRect = function (rect1: Rect, rect2: Rect): Rect {
  if (isRectAndRect(rect1, rect2)) {
    var x1 = Math.max(rect1.x, rect2.x), y1 = Math.max(rect1.y, rect2.y), x2 = Math.min(rect1.x + rect1.width, rect2.x + rect2.width), y2 = Math.min(rect1.y + rect1.height, rect2.y + rect2.height);
    return new Rect(x1, y1, x2 - x1, y2 - y1);
  }
  return null;
};
