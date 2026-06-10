import { notFound } from "next/navigation";
import RecipeDetail from "@/components/RecipeDetail";
import { RECIPES, getRecipe } from "@/lib/data/recipes";

export function generateStaticParams() {
  return RECIPES.map((r) => ({ id: r.id }));
}

export default async function RecipePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const recipe = getRecipe(id);
  if (!recipe) notFound();
  return <RecipeDetail recipe={recipe} />;
}
