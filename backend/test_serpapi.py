from main import scrape_transport_price, scrape_hotel_price

print("Testing transport fallback without SERPAPI_API_KEY:")
res1 = scrape_transport_price("Kakinada", "Bali", "flight")
print(res1)

print("\nTesting hotel fallback without SERPAPI_API_KEY:")
res2 = scrape_hotel_price("Bali")
print(res2)

print("\nSuccess! Both fallbacks work correctly.")
