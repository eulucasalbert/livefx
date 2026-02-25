export type Category = "ALL" | "TAP" | "X2" | "X3" | "GLOVE" | "HEART-ME" | "OUTROS" | "DOWNLOADS";

export interface Product {
  id: string;
  name: string;
  price: number;
  preview_video_url: string;
  download_file_url: string;
  description: string;
  category: Exclude<Category, "ALL">;
}

export const categories: Category[] = ["ALL", "TAP", "X2", "X3", "GLOVE", "HEART-ME", "OUTROS", "DOWNLOADS"];

export const products: Product[] = [
  {
    id: "1",
    name: "Neon Burst Tap",
    price: 4.99,
    preview_video_url: "https://cdn.pixabay.com/video/2021/02/25/66348-517637498_large.mp4",
    download_file_url: "#",
    description: "Explosive neon particle tap effect",
    category: "TAP",
  },
  {
    id: "2",
    name: "Holo Ripple",
    price: 3.99,
    preview_video_url: "https://cdn.pixabay.com/video/2020/07/30/45766-446090508_large.mp4",
    download_file_url: "#",
    description: "Holographic ripple on every tap",
    category: "TAP",
  },
  {
    id: "3",
    name: "Double Flash X2",
    price: 6.99,
    preview_video_url: "https://cdn.pixabay.com/video/2024/03/29/206145_large.mp4",
    download_file_url: "#",
    description: "Double flash multiplier effect",
    category: "X2",
  },
  {
    id: "4",
    name: "Cyber Split X2",
    price: 5.99,
    preview_video_url: "https://cdn.pixabay.com/video/2021/11/01/94062-641716506_large.mp4",
    download_file_url: "#",
    description: "Cyberpunk split screen doubler",
    category: "X2",
  },
  {
    id: "5",
    name: "Triple Storm X3",
    price: 9.99,
    preview_video_url: "https://cdn.pixabay.com/video/2022/03/14/110766-689949818_large.mp4",
    download_file_url: "#",
    description: "Triple effect storm multiplier",
    category: "X3",
  },
  {
    id: "6",
    name: "Prism Chain X3",
    price: 8.99,
    preview_video_url: "https://cdn.pixabay.com/video/2020/02/07/32079-390556706_large.mp4",
    download_file_url: "#",
    description: "Prismatic chain reaction triple",
    category: "X3",
  },
  {
    id: "7",
    name: "Laser Glove FX",
    price: 7.99,
    preview_video_url: "https://cdn.pixabay.com/video/2020/05/25/39832-424930080_large.mp4",
    download_file_url: "#",
    description: "Laser beam glove hand tracker",
    category: "GLOVE",
  },
  {
    id: "8",
    name: "Flame Glove",
    price: 6.99,
    preview_video_url: "https://cdn.pixabay.com/video/2024/08/09/225851_large.mp4",
    download_file_url: "#",
    description: "Fire trail glove effect",
    category: "GLOVE",
  },
  {
    id: "9",
    name: "Heart Rain",
    price: 4.99,
    preview_video_url: "https://cdn.pixabay.com/video/2020/09/05/49637-458480218_large.mp4",
    download_file_url: "#",
    description: "Raining hearts overlay",
    category: "HEART-ME",
  },
  {
    id: "10",
    name: "Love Burst",
    price: 5.99,
    preview_video_url: "https://cdn.pixabay.com/video/2021/04/14/71553-539594584_large.mp4",
    download_file_url: "#",
    description: "Exploding love burst effect",
    category: "HEART-ME",
  },
  {
    id: "11",
    name: "Pixel Tap",
    price: 3.49,
    preview_video_url: "https://cdn.pixabay.com/video/2023/07/28/173543-849767416_large.mp4",
    download_file_url: "#",
    description: "Retro pixel tap reaction",
    category: "TAP",
  },
  {
    id: "12",
    name: "Glitch X2",
    price: 7.49,
    preview_video_url: "https://cdn.pixabay.com/video/2022/12/23/143994-783601528_large.mp4",
    download_file_url: "#",
    description: "Glitch doubler effect",
    category: "X2",
  },
];
