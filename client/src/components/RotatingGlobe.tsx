/** 匹配界面旋转地球占位动画 */
export default function RotatingGlobe() {
  return (
    <div className="globe" aria-hidden="true">
      <div className="globe__sphere" />
      <div className="globe__ring globe__ring--1" />
      <div className="globe__ring globe__ring--2" />
    </div>
  );
}
