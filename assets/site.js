
const searchInput = document.querySelector("#archiveSearch");
const categoryFilter = document.querySelector("#categoryFilter");
const posts = Array.from(document.querySelectorAll(".archive-post"));

function updateArchive() {
  const query = (searchInput?.value || "").trim().toLowerCase();
  const category = categoryFilter?.value || "all";

  for (const post of posts) {
    const haystack = post.dataset.search || "";
    const postCategory = post.dataset.category || "";
    const queryMatch = !query || haystack.includes(query);
    const categoryMatch = category === "all" || postCategory === category;
    post.classList.toggle("is-hidden", !(queryMatch && categoryMatch));
  }
}

searchInput?.addEventListener("input", updateArchive);
categoryFilter?.addEventListener("change", updateArchive);
