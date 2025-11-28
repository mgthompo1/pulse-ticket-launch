import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SEOHead } from '@/components/SEOHead';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  Home,
  BookOpen,
  ArrowLeft,
  Rocket,
  Calendar,
  Paintbrush,
  Ticket,
  Megaphone,
  CreditCard,
  Plug,
  BarChart3,
  MapPin,
  HelpCircle
} from 'lucide-react';
import {
  categories,
  articles,
  searchArticles,
  getCategoryBySlug,
  getArticlesByCategory,
  getArticleBySlug
} from '@/data/knowledgeBase';
import ReactMarkdown from 'react-markdown';

// Icon mapping
const iconMap: { [key: string]: any } = {
  Rocket,
  Calendar,
  Paintbrush,
  Ticket,
  Megaphone,
  CreditCard,
  Plug,
  BarChart3,
  MapPin,
  HelpCircle
};

const KnowledgeBase = () => {
  const { categorySlug, articleSlug } = useParams();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Determine what to display
  const isHome = !categorySlug && !articleSlug;
  const isCategoryView = categorySlug && !articleSlug;
  const isArticleView = categorySlug && articleSlug;

  const currentCategory = categorySlug ? getCategoryBySlug(categorySlug) : null;
  const currentArticle = articleSlug ? getArticleBySlug(articleSlug) : null;
  const categoryArticles = currentCategory ? getArticlesByCategory(currentCategory.id) : [];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim().length > 2) {
      const results = searchArticles(query);
      setSearchResults(results);
    } else {
      setSearchResults([]);
    }
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
  };

  // Home View - Category Grid
  if (isHome && searchResults.length === 0) {
    return (
      <>
        <SEOHead
          title="Help Center - TicketFlo Knowledge Base"
          description="Find answers and learn how to use TicketFlo. Browse guides on event management, ticket sales, customization, payments, marketing, and more."
        />
        <div className="min-h-screen bg-gradient-to-b from-muted/30 to-background">
          {/* Header */}
          <header className="bg-background border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link to="/" className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-foreground">TicketFlo Help Center</span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to="/">
                    <Button variant="ghost" size="sm">
                      <Home className="h-4 w-4 mr-2" />
                      Home
                    </Button>
                  </Link>
                  <Link to="/support">
                    <Button variant="outline" size="sm">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>

          {/* Hero Section */}
          <section className="py-12 px-4">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl font-bold mb-4 text-foreground">How can we help you?</h1>
              <p className="text-xl text-muted-foreground mb-8">
                Search our knowledge base or browse categories below
              </p>

              {/* Search Bar */}
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search for articles..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-12 pr-4 py-6 text-lg"
                />
              </div>
            </div>
          </section>

          {/* Categories Grid */}
          <section className="py-8 px-4">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-foreground">Browse by Category</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categories.map((category) => {
                  const IconComponent = iconMap[category.icon];
                  return (
                    <Link key={category.id} to={`/help/${category.slug}`}>
                      <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer h-full hover:border-primary">
                        <CardHeader>
                          <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 rounded-lg ${category.color} bg-opacity-10`}>
                              {IconComponent && (
                                <IconComponent className={`h-6 w-6 ${category.color.replace('bg-', 'text-')}`} />
                              )}
                            </div>
                            <div className="flex-1">
                              <CardTitle className="text-lg">{category.name}</CardTitle>
                              <Badge variant="secondary" className="mt-1">
                                {category.articleCount} articles
                              </Badge>
                            </div>
                          </div>
                          <CardDescription className="text-sm">
                            {category.description}
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Popular Articles */}
          <section className="py-12 px-4 bg-muted/50">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-2xl font-bold mb-6 text-foreground">Popular Articles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {articles.slice(0, 6).map((article) => {
                const articleCategory = categories.find(c => c.id === article.category);
                return (
                  <Link
                    key={article.id}
                    to={`/help/${articleCategory?.slug}/${article.slug}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-4">
                        <h3 className="font-semibold mb-2">{article.title}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {article.content.substring(0, 150)}...
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          {article.keywords.slice(0, 3).map((keyword) => (
                            <Badge key={keyword} variant="outline" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="border-t py-8 px-4 mt-12">
            <div className="max-w-7xl mx-auto text-center">
              <p className="text-muted-foreground mb-4">
                Can't find what you're looking for?
              </p>
              <Link to="/support">
                <Button size="lg">
                  Contact Support
                </Button>
              </Link>
            </div>
          </footer>
        </div>
      </>
    );
  }

  // Search Results View
  if (searchQuery && searchResults.length > 0) {
    return (
      <>
        <SEOHead
          title={`Search results for "${searchQuery}" - TicketFlo Help`}
          description="Search results from TicketFlo knowledge base"
        />
        <div className="min-h-screen bg-background">
          <header className="bg-background border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link to="/help" className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-foreground">TicketFlo Help Center</span>
                </Link>
                <Button variant="ghost" size="sm" onClick={handleClearSearch}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            </div>
          </header>

          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Search Bar */}
            <div className="relative mb-8">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for articles..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-12 pr-4 py-6 text-lg"
              />
            </div>

            <h2 className="text-2xl font-bold mb-4 text-foreground">
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for "{searchQuery}"
            </h2>

            <div className="space-y-4">
              {searchResults.map((article) => {
                const articleCategory = categories.find(c => c.id === article.category);
                return (
                  <Link
                    key={article.id}
                    to={`/help/${articleCategory?.slug}/${article.slug}`}
                  >
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                            <p className="text-muted-foreground mb-3 line-clamp-2">
                              {article.content.substring(0, 200)}...
                            </p>
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary">{articleCategory?.name}</Badge>
                              {article.keywords.slice(0, 3).map((keyword) => (
                                <Badge key={keyword} variant="outline" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Category View - List of Articles
  if (isCategoryView && currentCategory) {
    return (
      <>
        <SEOHead
          title={`${currentCategory.name} - TicketFlo Help Center`}
          description={currentCategory.description}
        />
        <div className="min-h-screen bg-background">
          <header className="bg-background border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link to="/help" className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-foreground">TicketFlo Help Center</span>
                </Link>
                <Link to="/help">
                  <Button variant="ghost" size="sm">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    All Categories
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          <div className="max-w-4xl mx-auto px-4 py-8">
            {/* Category Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                {iconMap[currentCategory.icon] &&
                  React.createElement(iconMap[currentCategory.icon], {
                    className: `h-10 w-10 ${currentCategory.color.replace('bg-', 'text-')}`
                  })
                }
                <div>
                  <h1 className="text-3xl font-bold text-foreground">{currentCategory.name}</h1>
                  <p className="text-muted-foreground">{currentCategory.description}</p>
                </div>
              </div>
              <Badge variant="secondary">{categoryArticles.length} articles</Badge>
            </div>

            {/* Articles List */}
            <div className="space-y-4">
              {categoryArticles.map((article) => (
                <Link key={article.id} to={`/help/${currentCategory.slug}/${article.slug}`}>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer">
                    <CardContent className="p-6">
                      <h3 className="text-lg font-semibold mb-2">{article.title}</h3>
                      <p className="text-muted-foreground line-clamp-2">
                        {article.content.substring(0, 150)}...
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        {article.keywords.slice(0, 4).map((keyword) => (
                          <Badge key={keyword} variant="outline" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </>
    );
  }

  // Article View - Full Article Content
  if (isArticleView && currentArticle && currentCategory) {
    return (
      <>
        <SEOHead
          title={`${currentArticle.title} - TicketFlo Help`}
          description={currentArticle.content.substring(0, 160)}
        />
        <div className="min-h-screen bg-background">
          <header className="bg-background border-b sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="flex items-center justify-between">
                <Link to="/help" className="flex items-center gap-2">
                  <BookOpen className="h-6 w-6 text-primary" />
                  <span className="text-xl font-bold text-foreground">TicketFlo Help Center</span>
                </Link>
                <div className="flex items-center gap-2">
                  <Link to={`/help/${currentCategory.slug}`}>
                    <Button variant="ghost" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      {currentCategory.name}
                    </Button>
                  </Link>
                  <Link to="/support">
                    <Button variant="outline" size="sm">
                      Contact Support
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </header>

          <article className="max-w-4xl mx-auto px-4 py-8">
            {/* Breadcrumb */}
            <nav className="text-sm text-muted-foreground mb-6">
              <Link to="/help" className="hover:text-primary">Help Center</Link>
              {' / '}
              <Link to={`/help/${currentCategory.slug}`} className="hover:text-primary">
                {currentCategory.name}
              </Link>
              {' / '}
              <span className="text-foreground">{currentArticle.title}</span>
            </nav>

            {/* Article Header */}
            <header className="mb-8">
              <Badge variant="secondary" className="mb-3">{currentCategory.name}</Badge>
              <h1 className="text-4xl font-bold mb-4 text-foreground">{currentArticle.title}</h1>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Last updated: {new Date(currentArticle.lastUpdated).toLocaleDateString()}</span>
                <span>•</span>
                <div className="flex items-center gap-1">
                  {currentArticle.keywords.slice(0, 3).map((keyword) => (
                    <Badge key={keyword} variant="outline" className="text-xs">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            </header>

            {/* Article Content */}
            <div className="prose prose-lg dark:prose-invert max-w-none prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground">
              <ReactMarkdown>{currentArticle.content}</ReactMarkdown>
            </div>

            {/* Helpful Section */}
            <div className="mt-12 p-6 bg-muted/50 rounded-lg">
              <h3 className="font-semibold mb-4 text-foreground">Was this article helpful?</h3>
              <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="sm">👍 Yes</Button>
                <Button variant="outline" size="sm">👎 No</Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Still need help?{' '}
                <Link to="/support" className="text-primary hover:underline">
                  Contact our support team
                </Link>
              </p>
            </div>

            {/* Related Articles */}
            <div className="mt-12">
              <h3 className="text-xl font-bold mb-4 text-foreground">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {categoryArticles
                  .filter(a => a.id !== currentArticle.id)
                  .slice(0, 4)
                  .map((article) => (
                    <Link key={article.id} to={`/help/${currentCategory.slug}/${article.slug}`}>
                      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                        <CardContent className="p-4">
                          <h4 className="font-semibold mb-2">{article.title}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {article.content.substring(0, 100)}...
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
              </div>
            </div>
          </article>
        </div>
      </>
    );
  }

  // Fallback - Article/Category not found
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 text-foreground">Page Not Found</h1>
        <p className="text-muted-foreground mb-6">
          The help article or category you're looking for doesn't exist.
        </p>
        <Link to="/help">
          <Button>
            <Home className="h-4 w-4 mr-2" />
            Back to Help Center
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default KnowledgeBase;
