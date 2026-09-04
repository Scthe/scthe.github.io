declare module '*.module.css';
// declare module '*.module.css' {
// const classes: { [key: string]: string };
// export default classes;
// }

declare module '*.module.scss';
// declare module '*.module.scss' {
// const classes: { [key: string]: string };
// export default classes;
// }

interface Window {
  setAppTheme: (isLightTheme: boolean) => void;
}
